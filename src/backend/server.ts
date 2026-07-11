import 'dotenv/config'; // Load .env in local dev (no-op in production/AI Studio)
import express from 'express';
import path from 'path';
import * as fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { medicalKB } from './kb';
import { Message, TriageResult, PipelineStageTrace, UrgencyLevel, MedicalExtraction } from '../frontend/types';
import { AlertService } from './alertService';

const app = express();

// Custom CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'https://med-lens-ai-sigma.vercel.app'
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'medlens-triage-jwt-secret-key-12345';

const requireAuth = async (req: any, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing token.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const user = await db.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      language_preference: user.language_preference
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

// Set up JSON payload limit to handle base64 images safely
app.use(express.json({ limit: '10mb' }));

let globalAi: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!globalAi) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY is not configured or is invalid. Please configure a valid API key in the .env file.');
    }
    globalAi = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return globalAi;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 30000, context = 'API Call'): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(`${context} timed out after ${timeoutMs / 1000} seconds`);
      (err as any).status = 408; // Request Timeout
      reject(err);
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

async function callGeminiWithRetry<T>(
  apiCallFn: () => Promise<T>,
  context = 'Gemini Call',
  timeoutMs = 30000,
  maxRetries = 2
): Promise<T> {
  let attempt = 0;
  let delay = 1000;

  while (true) {
    try {
      attempt++;
      return await withTimeout(apiCallFn(), timeoutMs, context);
    } catch (err: any) {
      const isAuthError = 
        err.status === 400 || 
        err.status === 401 || 
        (err.message && (
          err.message.includes('API key not valid') || 
          err.message.includes('INVALID_ARGUMENT') || 
          err.message.includes('API_KEY_INVALID')
        ));

      if (isAuthError || attempt > maxRetries) {
        throw err;
      }

      console.warn(`[Retry] Attempt ${attempt} failed for ${context}. Retrying in ${delay}ms... Error:`, err.message || err);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

async function validateGeminiConnection() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    console.error('================================================================');
    console.error('FATAL ERROR: GEMINI_API_KEY is not configured or is invalid.');
    console.error('Please configure a valid API key in the .env file.');
    console.error('================================================================');
    process.exit(1);
  }

  try {
    const ai = getAiClient();
    // Run a minimal cheap call to check key validity
    await callGeminiWithRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping'
      });
    }, 'Startup validation ping', 15000, 2);
    console.log('[Gemini] Startup validation successful. Key is valid.');
  } catch (err: any) {
    console.error('================================================================');
    console.error('FATAL ERROR: Failed to authenticate with Gemini API.');
    console.error('Error details:', err.message || err);
    console.error('Please check your GEMINI_API_KEY in the .env file.');
    console.error('================================================================');
    process.exit(1);
  }
}

// ----------------------------------------------------
// Knowledge Base Embedding Initialization (Lazy & Safe)
// ----------------------------------------------------
interface EmbeddedKBChunk {
  id: string;
  topic: string;
  text: string;
  source: string;
  vector: number[];
}

let embeddedKB: EmbeddedKBChunk[] = [];
let kbEmbeddingPromise: Promise<void> | null = null;

async function ensureKBEmbeddings() {
  if (embeddedKB.length > 0) return;
  if (kbEmbeddingPromise) return kbEmbeddingPromise;

  kbEmbeddingPromise = (async () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('[KB] GEMINI_API_KEY is missing. In-memory embeddings cannot be generated. Retrieval stage will fall back to keyword search.');
      return;
    }

    console.log('[KB] Initializing medical knowledge base embedding pipeline...');
    try {
      const ai = getAiClient();

      console.log(`[KB] Mapping over ${medicalKB.length} chunks...`);
      // Fetch embeddings in batches or parallel
      const promises = medicalKB.map(async (chunk) => {
        try {
          const res = await callGeminiWithRetry(async () => {
            return await ai.models.embedContent({
              model: 'gemini-embedding-2-preview',
              contents: `${chunk.topic}\n${chunk.text}`
            });
          }, `Embedding chunk ${chunk.id}`, 30000, 2);

          const vector = (res as any).embedding?.values || (res as any).embeddings?.[0]?.values;
          if (vector && vector.length > 0) {
            return { ...chunk, vector } as EmbeddedKBChunk;
          } else {
            console.log(`[KB] Chunk ${chunk.id} vector is empty or undefined:`, JSON.stringify(res));
          }
        } catch (err: any) {
          console.error(`[KB] Failed to embed chunk ${chunk.id}:`, err.message || err);
        }
        return null;
      });

      const results = await Promise.all(promises);
      console.log(`[KB] results length: ${results.length}, non-null count: ${results.filter(x => x !== null).length}`);
      embeddedKB = results.filter((c): c is EmbeddedKBChunk => c !== null);
      console.log(`[KB] Successfully embedded and cached ${embeddedKB.length} chunks in memory.`);
    } catch (err) {
      console.error('[KB] Fatal error during medical knowledge base embedding:', err);
    }
  })();

  return kbEmbeddingPromise;
}

// Simple dot product for cosine similarity of normalized vectors
function getCosineSimilarity(v1: number[], v2: number[]): number {
  let dot = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
  }
  return dot;
}

// Fallback simple keyword matching if vector search is unavailable
function fallbackKeywordSearch(query: string, limit = 3): EmbeddedKBChunk[] {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const scored = medicalKB.map(chunk => {
    let score = 0;
    const combinedText = `${chunk.topic} ${chunk.text}`.toLowerCase();
    for (const word of words) {
      if (combinedText.includes(word)) {
        score++;
      }
    }
    return { ...chunk, score, vector: [] as number[] };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Perform Vector retrieval with keyword fallback
async function retrieveContext(queryText: string, limit = 3): Promise<{ context: string; chunks: { id: string; topic: string; source: string }[]; maxSimilarity: number }> {
  await ensureKBEmbeddings();
  const ai = getAiClient();

  if (embeddedKB.length === 0) {
    console.log('[RAG] Embedded database empty. Running keyword fallback...');
    const fallback = fallbackKeywordSearch(queryText, limit);
    const res = formatRetrievalResults(fallback);
    return { ...res, maxSimilarity: fallback.length > 0 ? 0.7 : 0.0 };
  }

  const res = await callGeminiWithRetry(async () => {
    return await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: queryText
    });
  }, 'Query Embedding', 30000, 2);

  const queryVector = (res as any).embedding?.values || (res as any).embeddings?.[0]?.values;

  if (!queryVector || queryVector.length === 0) {
    throw new Error('Could not generate query embedding');
  }

  const scored = embeddedKB.map(chunk => ({
    chunk,
    similarity: getCosineSimilarity(queryVector, chunk.vector)
  }));

  // Sort by highest similarity
  scored.sort((a, b) => b.similarity - a.similarity);

  const topMatches = scored.slice(0, limit).map(s => s.chunk);
  const maxSimilarity = scored[0]?.similarity || 0;
  console.log(`[RAG] Retrieved ${topMatches.length} matching medical context chunks. Top score: ${maxSimilarity.toFixed(4)}`);
  const formatted = formatRetrievalResults(topMatches);
  return { ...formatted, maxSimilarity };
}

function formatRetrievalResults(chunks: (EmbeddedKBChunk | (typeof medicalKB[0] & { vector: number[] }))[]) {
  if (chunks.length === 0) {
    return {
      context: 'No specific matching reference material found. Applying standard clinical triage protocols.',
      chunks: []
    };
  }

  const contextStr = chunks
    .map(c => `[Topic: ${c.topic} | Source: ${c.source}]\n${c.text}`)
    .join('\n\n');

  const metaList = chunks.map(c => ({ id: c.id, topic: c.topic, source: c.source }));
  return { context: contextStr, chunks: metaList };
}

// ----------------------------------------------------
// Hardcoded Safety Override Keywords
// ----------------------------------------------------
const EMERGENCY_KEYWORDS = [
  'chest pain', 'pressure in my chest', 'heart attack',
  'difficulty breathing', 'gasping for air', 'cannot breathe', 'shortness of breath',
  'slurred speech', 'facial droop', 'face drooping', 'stroke signs', 'weakness on one side',
  'severe bleeding', 'gushing blood', 'hemorrhage', 'spurting blood',
  'suicidal', 'suicidal thoughts', 'end my life', 'harm myself',
  'anaphylaxis', 'throat closing', 'swelling of the lips and tongue',
  // Tamil emergency keywords
  'நெஞ்சு வலி', 'மார்பு வலி', 'மூச்சு திணறல்', 'மூச்சுத் திணறல்', 'இரத்தப்போக்கு', 'அவசரம்'
];

function checkEmergencyOverride(text: string): boolean {
  const norm = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => norm.includes(kw));
}

// ----------------------------------------------------
// API Routes
// ----------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, language_preference = 'en' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }
  const existingUser = await db.getUserByEmail(email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email is already registered.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);

  const user = await db.createUser({
    name,
    email,
    password_hash,
    language_preference: language_preference as 'en' | 'ta'
  });

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      language_preference: user.language_preference
    }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const user = await db.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      language_preference: user.language_preference
    }
  });
});

app.get('/api/auth/me', requireAuth, (req: any, res) => {
  res.json(req.user);
});

// List historical sessions
app.get('/api/sessions', requireAuth, async (req: any, res) => {
  const sessions = await db.listSessions(req.user.id);
  res.json(sessions);
});

// Get detailed session info
app.get('/api/sessions/:id', requireAuth, async (req: any, res) => {
  const session = await db.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  if (session.userId && session.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this session' });
  }
  res.json(session);
});

// Create a new session
app.post('/api/sessions', requireAuth, async (req: any, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  const session = await db.createSession(id, req.user.id);
  res.json(session);
});

// Triage endpoint: Executing the 4-Stage pipeline
app.post('/api/triage', requireAuth, async (req: any, res) => {
  try {
    const { sessionId, messageId, text, image, language = 'en' } = req.body;

  if (!sessionId || !text) {
    return res.status(400).json({ error: 'sessionId and text are required.' });
  }

  // Validate session ownership
  const session = await db.getSession(sessionId);
  if (session && session.userId && session.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this session.' });
  }

  const ai = getAiClient();

  // 1. Intent Classification Step
  let intent: 'symptom_triage' | 'general_health_question' | 'follow_up' | 'out_of_scope' = 'symptom_triage';
  try {
    console.log(`[Intent Classify] Categorizing input: "${text.substring(0, 60)}..."`);
    const classificationPrompt = `You are a medical intent classification assistant. Read the user message below and classify it into exactly one of these four categories:
- "symptom_triage": The user is describing or asking about a specific symptom they are experiencing right now or seeking a triage recommendation.
- "general_health_question": The user is asking a general health, wellness, medical fact, or biological question not tied to an active personal symptom triage.
- "follow_up": The user is asking a follow-up question that builds on previous messages (e.g. asking "what about dizziness too?", "does that mean...", or referring to previous statements).
- "out_of_scope": The user is asking about something completely non-medical, unrelated to health, or greeting/chit-chatting without medical context.

User Message: "${text}"

Respond with ONLY one word from this list: symptom_triage, general_health_question, follow_up, out_of_scope. Do not include any punctuation, formatting, or extra text.`;

    const response = await callGeminiWithRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: classificationPrompt
      });
    }, 'Intent Classification', 30000, 2);

    const parsedIntent = response.text?.trim().toLowerCase();
    if (parsedIntent && ['symptom_triage', 'general_health_question', 'follow_up', 'out_of_scope'].includes(parsedIntent)) {
      intent = parsedIntent as any;
    }
    console.log(`[Intent Classify] Detected intent: ${intent}`);
  } catch (err: any) {
    console.error('[Intent Classify] Classification failed:', err);
    return res.status(502).json({
      error: 'AI service is temporarily unavailable',
      details: err.message || 'Intent classification failed'
    });
  }

  // 2. Route Out-of-Scope Requests Immediately
  if (intent === 'out_of_scope') {
    const responseText = language === 'ta'
      ? "நான் ஆரோக்கியம் மற்றும் அறிகுறிகள் தொடர்பான கேள்விகளுக்கு மட்டுமே பதிலளிக்க முடியும். தயவுசெய்து உங்கள் உடநலக் குறைபாடு அல்லது மருத்துவ அறிகுறிகள் பற்றிப் பகிருங்கள்."
      : "I'm built to help with health-related questions. Could you tell me more about a symptom or health concern?";
    
    const skippedTrace: PipelineStageTrace[] = [
      { stage: 'extraction', title: 'Skipped - Input is out of scope.', status: 'skipped', durationMs: 0 },
      { stage: 'retrieval', title: 'Skipped - Input is out of scope.', status: 'skipped', durationMs: 0 },
      { stage: 'reasoning', title: 'Skipped - Input is out of scope.', status: 'skipped', durationMs: 0 },
      { stage: 'formatting', title: 'Completed - Redirected response generated.', status: 'completed', durationMs: 0 }
    ];

    const finalTriageResult: TriageResult = {
      id: `triage_${Date.now()}`,
      sessionId,
      urgencyLevel: 'Routine',
      explanation: responseText,
      redFlags: [],
      recommendedSpecialist: language === 'ta' ? 'இல்லை' : 'None',
      disclaimer: language === 'ta' ? 'இந்த கருவி ஒரு மருத்துவ நிபுணர் அல்ல.' : 'This tool is not a medical professional.',
      pipelineTrace: skippedTrace,
      createdAt: new Date().toISOString(),
      language,
      detectedIntent: 'out_of_scope'
    };

    const assistantMessage: Message = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      text: responseText,
      triageResult: finalTriageResult,
      timestamp: new Date().toISOString()
    };

    const userMessage: Message = {
      id: messageId || `msg_${Date.now()}_user`,
      role: 'user',
      text,
      image,
      timestamp: new Date().toISOString()
    };

    await db.addMessage(sessionId, userMessage);
    await db.setSessionLanguage(sessionId, language);
    const updatedSession = await db.addMessage(sessionId, assistantMessage);

    return res.json({
      triageResult: finalTriageResult,
      session: updatedSession
    });
  }

  // Pre-process: Translate Tamil query to English internally for RAG accuracy
  let translatedText = text;
  if (language === 'ta') {
    try {
      console.log(`[Language] Translating query from Tamil to English for retrieval...`);
      const translationRes = await callGeminiWithRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Translate the following patient symptom description into clear, clinical English. Return ONLY the translated English text, with no extra commentary or introductory text:
          
          "${text}"`
        });
      }, 'Tamil to English translation', 30000, 2);

      const resText = translationRes.text?.trim();
      if (resText) {
        translatedText = resText;
      }
      console.log(`[Language] Translated input: "${translatedText}"`);
    } catch (err: any) {
      console.error('[Language] Translation failed:', err);
      return res.status(502).json({
        error: 'AI service is temporarily unavailable',
        details: err.message || 'Translation failed'
      });
    }
  }

  const pipelineTrace: PipelineStageTrace[] = [];
  let extractedData: MedicalExtraction | undefined = undefined;
  let retrievedContext = '';
  let retrievedChunks: { id: string; topic: string; source: string }[] = [];

  // Define fallback or safety overrides (check both original and translated text)
  const hasEmergencyKeywords = checkEmergencyOverride(translatedText) || checkEmergencyOverride(text);

  // ----------------------------------------------------
  // STAGE 1: Extraction (Vision, runs only if image is provided)
  // ----------------------------------------------------
  const stage1Start = Date.now();
  if (image) {
    pipelineTrace.push({
      stage: 'extraction',
      title: 'Reading report and symptoms from image...',
      status: 'running'
    });

    try {
      // Parse data URI to extract base64 parts
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      let mimeType = 'image/png';
      let base64Data = image;

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }

      const prompt = `You are a data extraction assistant. Given an image of a medical document, symptom photo, prescription, or report, extract ONLY factual, visible information. Return valid JSON matching exactly this schema, with no extra text:
{
  "medicines": ["string"],
  "lab_values": [{"name": "string", "value": "string", "unit": "string"}],
  "visible_symptoms": ["string"],
  "document_type": "prescription | lab_report | symptom_photo | unclear"
}
If a field has no data, return an empty array. Never infer a diagnosis here.`;

      const response = await callGeminiWithRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            },
            prompt
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                medicines: { type: Type.ARRAY, items: { type: Type.STRING } },
                lab_values: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      value: { type: Type.STRING },
                      unit: { type: Type.STRING }
                    },
                    required: ['name', 'value', 'unit']
                  }
                },
                visible_symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
                document_type: { type: Type.STRING }
              },
              required: ['medicines', 'lab_values', 'visible_symptoms', 'document_type']
            }
          }
        });
      }, 'Image Data Extraction', 30000, 2);

      const extractedJSON = JSON.parse(response.text || '{}');
      extractedData = extractedJSON as MedicalExtraction;

      pipelineTrace[0] = {
        stage: 'extraction',
        title: 'Extracted factual data successfully.',
        status: 'completed',
        output: JSON.stringify(extractedData, null, 2),
        durationMs: Date.now() - stage1Start
      };
    } catch (err: any) {
      console.error('[Pipeline Stage 1] Image extraction failed:', err);
      return res.status(502).json({
        error: 'AI service is temporarily unavailable',
        details: err.message || 'Image extraction failed'
      });
    }
  } else {
    pipelineTrace.push({
      stage: 'extraction',
      title: 'No document or symptom photo provided.',
      status: 'skipped',
      durationMs: 0
    });
  }

  // ----------------------------------------------------
  // STAGE 2: Knowledge Base Retrieval
  // ----------------------------------------------------
  const stage2Start = Date.now();
  pipelineTrace.push({
    stage: 'retrieval',
    title: 'Checking medical knowledge base...',
    status: 'running'
  });

  let maxSimilarity = 0.0;
  try {
    let combinedQuery = translatedText;
    if (extractedData) {
      const parts: string[] = [];
      if (extractedData.visible_symptoms.length > 0) parts.push(`Symptoms: ${extractedData.visible_symptoms.join(', ')}`);
      if (extractedData.medicines.length > 0) parts.push(`Medicines: ${extractedData.medicines.join(', ')}`);
      if (extractedData.lab_values.length > 0) {
        const labs = extractedData.lab_values.map(l => `${l.name}=${l.value} ${l.unit}`).join(', ');
        parts.push(`Labs: ${labs}`);
      }
      if (parts.length > 0) {
        combinedQuery += `\nExtracted details: ${parts.join('. ')}`;
      }
    }

    const searchResult = await retrieveContext(combinedQuery, 3);
    retrievedContext = searchResult.context;
    retrievedChunks = searchResult.chunks;
    maxSimilarity = searchResult.maxSimilarity;

    pipelineTrace[pipelineTrace.length - 1] = {
      stage: 'retrieval',
      title: `Retrieved ${retrievedChunks.length} reference documents.`,
      status: 'completed',
      output: `Retrieved Chunks:\n` + retrievedChunks.map(c => `- ${c.topic} (Source: ${c.source})`).join('\n') + `\n\nFull Reference Content:\n` + retrievedContext + `\n\nMax Similarity Score: ${maxSimilarity.toFixed(4)}`,
      durationMs: Date.now() - stage2Start
    };
  } catch (err: any) {
    console.error('[Pipeline Stage 2] Retrieval failed:', err);
    return res.status(502).json({
      error: 'AI service is temporarily unavailable',
      details: err.message || 'Knowledge retrieval failed'
    });
  }

  // 3. Relevance Score Evaluation
  const RELEVANCE_THRESHOLD = 0.65;
  const isLowRelevance = maxSimilarity < RELEVANCE_THRESHOLD;

  // ----------------------------------------------------
  // STAGE 3: Grounded Reasoning
  // ----------------------------------------------------
  const stage3Start = Date.now();
  pipelineTrace.push({
    stage: 'reasoning',
    title: 'Analyzing clinical factors and symptoms...',
    status: 'running'
  });

  let reasoningOutput = '';
  try {
    const targetLangName = language === 'ta' ? 'Tamil' : 'English';
    let systemInstruction = '';
    let contentsPrompt = '';

    if (intent === 'general_health_question') {
      systemInstruction = `You are a professional medical information assistant. Provide a simple, clear, conversational answer to the patient's general health/wellness question in ${targetLangName}.`;
      contentsPrompt = `You are a medical assistant. Review the following general health or wellness question and answer it in a clear, friendly, conversational manner.

User Input:
${translatedText}

${isLowRelevance ? `IMPORTANT: The medical reference base did not return relevant grounding resources for this query. You MUST state clearly that you do not have enough grounded information from the database to answer confidently, rather than trying to speculate or answer using weak/irrelevant context, and encourage them to consult a healthcare provider.` : `Clinically Verified Grounding Reference (Knowledge Base):
${retrievedContext}`}

Rules:
1. Provide a direct, comforting answer.
2. Respond in ${targetLangName}.`;
    } else if (intent === 'follow_up') {
      let historyContext = '';
      const sessionObj = await db.getSession(sessionId);
      if (sessionObj && sessionObj.messages && sessionObj.messages.length > 0) {
        const recent = sessionObj.messages.slice(-4);
        historyContext = recent.map(m => `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.text}`).join('\n');
      }

      systemInstruction = `You are a professional medical assistant continuing a conversation. Refer to the recent dialogue history to contextly answer the patient's follow-up query in ${targetLangName}.`;
      contentsPrompt = `You are a medical assistant. The patient is asking a follow-up query. Review the conversation history below and the new query, then reason step-by-step to provide a coherent answer.

Conversation History:
${historyContext}

ACTUAL USER INPUT (patient's described symptoms):
"${translatedText}"

IMPORTANT instruction: The above text under ACTUAL USER INPUT is the ONLY case you are triaging right now. Do not copy or reuse any other symptoms, fever data, or examples that are not present in this ACTUAL USER INPUT.

${isLowRelevance ? `IMPORTANT: The medical reference base did not return relevant grounding resources for this follow-up query. You MUST state clearly that you do not have enough grounded information from the database to answer confidently, rather than trying to speculate or answer using weak/irrelevant context, and encourage them to consult a healthcare provider.` : `Clinically Verified Grounding Reference (Knowledge Base):
${retrievedContext}`}

Rules:
1. Ensure your response connects smoothly to the previous context.
2. Respond in ${targetLangName}.`;
    } else {
      systemInstruction = `You are a professional medical triage support agent. Provide objective, clear, structured clinical analysis step-by-step in ${targetLangName}.`;
      contentsPrompt = `You are a highly analytical, cautious clinical triage assistant. Review the symptoms provided and reason step-by-step through the clinical urgency. DO NOT provide a definitive medical diagnosis. Identify warning flags and recommend appropriate specialties.
      
ACTUAL USER INPUT (patient's described symptoms):
"${translatedText}"

IMPORTANT instruction: The above text under ACTUAL USER INPUT is the ONLY case you are triaging right now. Do not copy or reuse any other symptoms, fever data, or examples that are not present in this ACTUAL USER INPUT.

${extractedData ? `Extracted facts from attached medical report/image:\n${JSON.stringify(extractedData, null, 2)}` : ''}

${isLowRelevance ? `IMPORTANT: The medical reference base did not return relevant grounding resources for this query. You MUST state clearly that you do not have enough grounded information from the database to answer confidently, rather than trying to speculate or answer using weak/irrelevant context, and encourage them to consult a healthcare provider.` : `Clinically Verified Grounding Reference (Knowledge Base):
${retrievedContext}`}

Rules:
1. Ground your reasoning strictly in the grounding reference if available.
2. If symptoms suggest critical situations (chest pain, shortness of breath, FAST stroke signs, or severe bleeding), classify as Emergency immediately.
3. Be transparent and list your clinical deductions in 2-3 short, clear bullet points.
4. Respond in ${targetLangName}. Keep medical terms accurate; add the English term in parentheses on first use if a direct translation could be ambiguous.`;
    }

    console.log('[Pipeline Stage 3] Reasoning Prompt sent to Gemini:\n', contentsPrompt);
    const response = await callGeminiWithRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contentsPrompt,
        config: {
          systemInstruction
        }
      });
    }, 'Clinical Reasoning', 30000, 2);

    reasoningOutput = response.text || '';

    pipelineTrace[pipelineTrace.length - 1] = {
      stage: 'reasoning',
      title: 'Completed reasoning synthesis.',
      status: 'completed',
      output: reasoningOutput,
      durationMs: Date.now() - stage3Start
    };
  } catch (err: any) {
    console.error('[Pipeline Stage 3] Reasoning failed:', err);
    pipelineTrace[pipelineTrace.length - 1] = {
      stage: 'reasoning',
      title: 'Reasoning process encountered an error.',
      status: 'failed',
      output: err.message || 'Unknown reasoning error',
      durationMs: Date.now() - stage3Start
    };
    throw err;
  }

  // ----------------------------------------------------
  // STAGE 4: Response Formatting
  // ----------------------------------------------------
  const stage4Start = Date.now();
  pipelineTrace.push({
    stage: 'formatting',
    title: 'Formatting final summary and triage card...',
    status: 'running'
  });

  let finalTriageResult: TriageResult;
    // Start Response Formatting
    const targetLangName = language === 'ta' ? 'Tamil' : 'English';
    if (hasEmergencyKeywords) {
      // Immediate emergency safety override to prevent any model lag/mistake
      if (language === 'ta') {
        finalTriageResult = {
          id: `triage_${Date.now()}`,
          sessionId,
          urgencyLevel: 'Emergency',
          explanation: 'உங்களது அறிகுறிகள் மார்பு வலி, தீவிர மூச்சுத்திணறல், கடுமையான இரத்தப்போக்கு அல்லது பக்கவாதத்தின் அறிகுறிகள் போன்ற மிகத் தீவிரமான மருத்துவ எச்சரிக்கைகளைக் கொண்டுள்ளன. உடனடியாக அவசர மருத்துவ உதவியை நாடுவது முக்கியம்.',
          redFlags: [
            'மார்பு வலி, அழுத்தம் அல்லது பாரமான உணர்வு (Chest pain/pressure)',
            'திடீர் கடுமையான மூச்சுத்திணறல் (Severe sudden dyspnea)',
            'திடீர் பலவீனம் அல்லது முகம் கோணல் (Sudden weakness/FAST)',
            'கடுமையான இரத்தப்போக்கு (Severe uncontrolled bleeding)',
            'திடீர் குழப்பம் அல்லது பேச்சுக் குளறல் (Sudden confusion/slurred speech)'
          ],
          recommendedSpecialist: 'அவசர சிகிச்சை பிரிவு / அவசர கால மருத்துவ சேவை (EMS)',
          disclaimer: 'இந்த கருவி ஒரு மருத்துவ நிபுணர் அல்ல. உயிருக்கு ஆபத்தான அவசர நிலையில் இருந்தால், உடனடியாக அவசர உதவி எண்ணை (108 அல்லது உங்கள் உள்ளூர் அவசர எண்) அழைக்கவும்.',
          extractedData,
          pipelineTrace,
          createdAt: new Date().toISOString(),
          language,
          detectedIntent: intent
        };
      } else {
        finalTriageResult = {
          id: `triage_${Date.now()}`,
          sessionId,
          urgencyLevel: 'Emergency',
          explanation: 'Your described symptoms contain severe, critical clinical warning signs (such as chest pain, extreme breathing difficulties, severe bleeding, or potential stroke indicators). Immediate professional medical evaluation is crucial.',
          redFlags: [
            'Chest pain, tightness, or heavy pressure',
            'Severe sudden difficulty breathing or gasping',
            'Sudden weakness, numbness, or facial drooping (FAST)',
            'Severe uncontrolled bleeding',
            'Sudden severe confusion or slurred speech'
          ],
          recommendedSpecialist: 'Emergency Medical Services (EMS) / Emergency Department',
          disclaimer: 'This tool is not a medical professional. If you are experiencing a life-threatening emergency, call emergency services (911 or your local emergency number) immediately.',
          extractedData,
          pipelineTrace,
          createdAt: new Date().toISOString(),
          language,
          detectedIntent: intent
        };
      }
    } else {
      const prompt = `You are a formatting assistant. Take the clinical reasoning analysis below and format it into a structured, highly compliant, user-friendly JSON schema.
      
Clinical reasoning:
${reasoningOutput}

Format strictly to this JSON model and return nothing else:
{
  "urgency_level": "Emergency | Urgent | Routine | Self-care",
  "explanation": "Provide a comforting, 2-4 sentence summary of what may be occurring or answer the query directly, written in the target language (${targetLangName}).",
  "red_flags": ["List specific warning symptoms written in the target language (${targetLangName}) that should prompt immediate ER check, or leave empty if none are mentioned."],
  "recommended_specialist": "Recommend a clinical specialist written in the target language (${targetLangName}) to follow up with, or use 'None / General Consultation' if not applicable.",
  "disclaimer": "This is not a medical diagnosis. Consult a licensed healthcare provider written in the target language (${targetLangName})."
}`;

      const response = await callGeminiWithRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                urgency_level: { type: Type.STRING },
                explanation: { type: Type.STRING },
                red_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommended_specialist: { type: Type.STRING },
                disclaimer: { type: Type.STRING }
              },
              required: ['urgency_level', 'explanation', 'red_flags', 'recommended_specialist', 'disclaimer']
            }
          }
        });
      }, 'Response Formatting', 30000, 2);

      const formattedJSON = JSON.parse(response.text || '{}');
      
      let finalUrgency: UrgencyLevel = 'Routine';
      const parsedUrgency = formattedJSON.urgency_level;
      if (['Emergency', 'Urgent', 'Routine', 'Self-care'].includes(parsedUrgency)) {
        finalUrgency = parsedUrgency as UrgencyLevel;
      }

      finalTriageResult = {
        id: `triage_${Date.now()}`,
        sessionId,
        urgencyLevel: finalUrgency,
        explanation: formattedJSON.explanation,
        redFlags: formattedJSON.red_flags || [],
        recommendedSpecialist: formattedJSON.recommended_specialist,
        disclaimer: formattedJSON.disclaimer,
        extractedData,
        pipelineTrace,
        createdAt: new Date().toISOString(),
        language,
        detectedIntent: intent
      };
    }

    pipelineTrace[pipelineTrace.length - 1] = {
      stage: 'formatting',
      title: 'Triage card created successfully.',
      status: 'completed',
      durationMs: Date.now() - stage4Start
    };

    // Save final trace timestamps to final output
    finalTriageResult.pipelineTrace = JSON.parse(JSON.stringify(pipelineTrace));

    // Construct the Assistant Message
    const assistantMessage: Message = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      text: finalTriageResult.explanation,
      triageResult: finalTriageResult,
      timestamp: new Date().toISOString()
    };

    // Append user message + assistant message to Database
    const userMessage: Message = {
      id: messageId || `msg_${Date.now()}_user`,
      role: 'user',
      text,
      image,
      timestamp: new Date().toISOString()
    };

    await db.addMessage(sessionId, userMessage);
    await db.setSessionLanguage(sessionId, language);
    const updatedSession = await db.addMessage(sessionId, assistantMessage);

    res.json({
      triageResult: finalTriageResult,
      session: updatedSession
    });

  } catch (err: any) {
    console.error('[Pipeline Triage Route] Execution failed:', err);
    res.status(503).json({
      error: 'AI service is temporarily unavailable',
      details: err.message || 'Server encountered an error during triage pipeline processing'
    });
  }
});

// Clear session history for authenticated user
app.post('/api/clear-history', requireAuth, async (req: any, res) => {
  await db.clearUserSessions(req.user.id);
  res.json({ success: true, message: 'All session histories have been successfully cleared.' });
});

// Emergency Contact & SOS Alert Endpoints
app.post('/api/emergency-contact', requireAuth, async (req: any, res) => {
  const { sessionId, name, phone, email, relation, consentGivenAt } = req.body;
  if (!sessionId || !name || !phone || !relation || !consentGivenAt) {
    return res.status(400).json({ error: 'Missing required contact fields or consent.' });
  }
  const session = await db.getSession(sessionId);
  if (session && session.userId && session.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this session.' });
  }
  const contact = await db.saveEmergencyContact({ sessionId, name, phone, email, relation, consentGivenAt });
  res.json({ success: true, contact });
});

app.get('/api/emergency-contact/:sessionId', requireAuth, async (req: any, res) => {
  const session = await db.getSession(req.params.sessionId);
  if (session && session.userId && session.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this session.' });
  }
  const contact = await db.getEmergencyContact(req.params.sessionId);
  if (!contact) {
    return res.status(404).json({ error: 'No contact found for this session.' });
  }
  res.json(contact);
});

app.post('/api/emergency-alert', requireAuth, async (req: any, res) => {
  const { sessionId, summary } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required.' });
  }

  const session = await db.getSession(sessionId);
  if (session && session.userId && session.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this session.' });
  }

  const contact = await db.getEmergencyContact(sessionId);
  if (!contact) {
    return res.status(404).json({ error: 'No emergency contact registered for this session.' });
  }

  try {
    const timestamp = new Date().toLocaleString();
    console.log(`[Server] Triggering alert service for session ${sessionId}...`);
    const result = await AlertService.sendAlert({
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      summary: summary || 'Urgent emergency medical triage triggered',
      timestamp
    });

    const alertLog = await db.logEmergencyAlert({
      id: `alert_${Date.now()}`,
      sessionId,
      contactName: contact.name,
      contactPhone: contact.phone,
      alertType: result.type,
      status: result.status,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, alert: alertLog });
  } catch (err: any) {
    console.error('[Server] Failed to trigger alert:', err);
    res.status(500).json({ error: 'Failed to send alert notification.', details: err.message });
  }
});


// ----------------------------------------------------
// Vite Dev Server / Static Ingress Configuration
// ----------------------------------------------------
async function initializeServer() {
  await validateGeminiConnection();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Vite] Development middleware mounted successfully.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Express] Serving static files in production from: ' + distPath);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] MedLens AI running on port ${PORT}`);
    // Warm up KB embeddings asynchronously
    ensureKBEmbeddings().catch(err => console.error('[Startup] KB warm-up failed:', err));
  });
}

initializeServer().catch(err => {
  console.error('[Startup] Failed to launch server:', err);
});
