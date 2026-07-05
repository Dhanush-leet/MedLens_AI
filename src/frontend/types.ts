export type UrgencyLevel = 'Emergency' | 'Urgent' | 'Routine' | 'Self-care';

export interface MedicalExtraction {
  medicines: string[];
  lab_values: { name: string; value: string; unit: string }[];
  visible_symptoms: string[];
  document_type: 'prescription' | 'lab_report' | 'symptom_photo' | 'unclear';
}

export interface TriageResult {
  id: string;
  sessionId: string;
  urgencyLevel: UrgencyLevel;
  explanation: string;
  redFlags: string[];
  recommendedSpecialist: string;
  disclaimer: string;
  extractedData?: MedicalExtraction;
  pipelineTrace?: PipelineStageTrace[];
  createdAt: string;
  language?: 'en' | 'ta';
  detectedIntent?: 'symptom_triage' | 'general_health_question' | 'follow_up' | 'out_of_scope';
}

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  language_preference: 'en' | 'ta';
}

export type UserInfo = Omit<User, 'password_hash'>;

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string; // base64 encoded string
  triageResult?: TriageResult;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: string;
  language?: 'en' | 'ta';
  userId?: string;
}

export interface PipelineStageTrace {
  stage: 'extraction' | 'retrieval' | 'reasoning' | 'formatting';
  title: string;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  output?: string;
  durationMs?: number;
}

export interface EmergencyContact {
  sessionId: string;
  name: string;
  phone: string;
  email?: string;
  relation: string;
  consentGivenAt: string;
}

export interface EmergencyAlert {
  id: string;
  sessionId: string;
  contactName: string;
  contactPhone: string;
  alertType: 'sms' | 'email' | 'mock';
  status: 'sent' | 'failed';
  timestamp: string;
}

