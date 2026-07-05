import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HeartPulse,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  Sparkles,
  User,
  LogOut,
  Dna,
  ArrowLeft,
  Clock,
  Loader2
} from 'lucide-react';
import { ChatSession, Message, PipelineStageTrace } from './types';
import { ImageUpload } from './components/ImageUpload';
import { ResultCard } from './components/ResultCard';
import { PipelineTrace } from './components/PipelineTrace';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { useAuth } from './components/AuthContext';
import { VoiceInput } from './components/VoiceInput';
import { EmergencyBanner } from './components/EmergencyBanner';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { t, i18n } = useTranslation();

  const { user, token, isLoading: isAuthLoading, isAuthenticated, logout } = useAuth();

  // Navigation view router for unauthenticated state ('landing' | 'login' | 'signup')
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'signup'>('landing');

  const patientName = user?.name || '';

  // Sync translation lang if user preference changes
  useEffect(() => {
    if (user && user.language_preference) {
      i18n.changeLanguage(user.language_preference);
    }
  }, [user, i18n]);

  // Core Data States
  const [sessions, setSessions] = useState<{ id: string; createdAt: string; lastMessageText: string; language?: 'en' | 'ta' }[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Loading & Pipeline State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStages, setLoadingStages] = useState<PipelineStageTrace[]>([]);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Ref to always read the latest sessionId inside async callbacks (avoids stale closure)
  const currentSessionIdRef = useRef<string>('');
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);

  // Pre-seeded template symptoms for instant clinical evaluation
  const suggestedTemplates = [
    {
      title: i18n.language === 'ta' ? 'அவசரகால மேலெழுதல்' : 'Emergency Override Warning',
      text: i18n.language === 'ta' 
        ? 'எனக்கு மார்பில் கடுமையான அழுத்தம் மற்றும் மார்பு வலி உள்ளது, இது என் இடது தோள்பட்டை மற்றும் கைக்கு பரவுகிறது. அதோடு மூச்சுத் திணறலும் உள்ளது.'
        : 'I have had severe crushing chest pain and pressure spreading to my left shoulder and arm, accompanied by shortness of breath and a cold sweat.',
      description: i18n.language === 'ta' ? 'அவசர கால வழித்தடத்தை நேரடியாகத் தூண்டுகிறது.' : 'Triggers vital safety override & rapid dispatch routing.'
    },
    {
      title: i18n.language === 'ta' ? 'கண் தொற்று' : 'Ophthalmic Infection',
      text: i18n.language === 'ta'
        ? 'என் வலது கண் மிகவும் சிவந்து, அரிப்பாக, மணல் விழுந்தது போல் உள்ளது, மேலும் காலையில் எழுந்ததும் மஞ்சள்-பச்சை நிறத்தில் கசிவு ஏற்படுகிறது.'
        : 'My right eye is bright pink, itchy, feels very gritty, and has yellow-green discharge when I wake up in the morning.',
      description: i18n.language === 'ta' ? 'சரிபார்க்கப்பட்ட கண் தொற்று நெறிமுறைகளை மீட்டெடுக்கிறது.' : 'Retrieves Grounded Conjunctivitis guidelines.'
    },
    {
      title: i18n.language === 'ta' ? 'தோல் சொறி' : 'Dermatology Flareup',
      text: i18n.language === 'ta'
        ? 'என் முழங்கைகள் மற்றும் முழங்கால்களின் பின்னால் கடந்த ஒரு மாதமாக கடுமையான அரிப்புடன் சிவந்த சொறி ஏற்பட்டுள்ளது.'
        : 'I have an extremely itchy, red, scaly rash on my elbows and the back of my knees that has flared up over the last month.',
      description: i18n.language === 'ta' ? 'தோல் அலர்ஜி மற்றும் சொறி வழிகாட்டுதல்களை ஆராய்கிறது.' : 'References chronic eczema & contact dermatitis.'
    },
    {
      title: i18n.language === 'ta' ? 'சிறுநீர் பாதை தொற்று' : 'General Urinary Tract',
      text: i18n.language === 'ta'
        ? 'எனக்கு நாள் முழுவதும் அடிக்கடி சிறுநீர் கழிக்க வேண்டும் என்ற உணர்வு உள்ளது, சிறுநீர் கழிக்கும் போது கடுமையான எரிச்சல் ஏற்படுகிறது.'
        : 'I have had a sudden, persistent urge to urinate all day, and it burns extremely badly whenever I go.',
      description: i18n.language === 'ta' ? 'சிறுநீர் பாதை தொற்று (UTI) நெறிமுறைக்கு மாற்றுகிறது.' : 'Maps to urinary tract infection (UTI) protocol.'
    }
  ];

  // Load session list on startup when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessionList();
    }
  }, [isAuthenticated]);

  // Sync active session whenever currentSessionId changes
  useEffect(() => {
    if (currentSessionId && isAuthenticated) {
      fetchSessionDetails(currentSessionId);
    } else {
      setCurrentSession(null);
    }
  }, [currentSessionId, isAuthenticated]);

  // Scroll to bottom on new messages or loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isLoading]);

  const fetchSessionList = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter out stale empty sessions for cleaner sidebar
        const meaningful = data.filter((s: any) => s.lastMessageText !== 'Empty Session');
        setSessions(meaningful);
        // Only auto-select if nothing is already selected (use ref to avoid stale closure)
        if (meaningful.length > 0 && !currentSessionIdRef.current) {
          setCurrentSessionId(meaningful[0].id);
          if (meaningful[0].language) {
            i18n.changeLanguage(meaningful[0].language);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching session list:', err);
    }
  }, [token, i18n]);

  const fetchSessionDetails = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentSession(data);
        if (data.language) {
          i18n.changeLanguage(data.language);
        }
      }
    } catch (err) {
      console.error('Error fetching session details:', err);
    }
  };

  const createNewSession = useCallback(async (): Promise<string | null> => {
    if (!token) return null;
    const newId = `session_${Date.now()}`;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: newId })
      });
      if (res.ok) {
        setCurrentSessionId(newId);
        setInputText('');
        setSelectedImage(null);
        fetchSessionList();
        return newId;
      }
    } catch (err) {
      console.error('Error creating session:', err);
    }
    return null;
  }, [token, fetchSessionList]);

  const clearAllHistory = async () => {
    if (!token) return;
    if (window.confirm(i18n.language === 'ta' ? 'அனைத்து ஆலோசனை பதிவுகளையும் நீக்க விரும்புகிறீர்களா? இதை மீட்டெடுக்க முடியாது.' : 'Are you sure you want to clear all consultation records? This cannot be undone.')) {
      try {
        const res = await fetch('/api/clear-history', { 
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          setSessions([]);
          setCurrentSessionId('');
          setCurrentSession(null);
          setInputText('');
          setSelectedImage(null);
        }
      } catch (err) {
        console.error('Error clearing history:', err);
      }
    }
  };

  // Run a multi-step simulated trace sequence on the client while the server compiles response
  const startLoadingAnimation = (hasImage: boolean) => {
    const initialStages: PipelineStageTrace[] = [
      { stage: 'extraction', title: hasImage ? 'Extracting facts from uploaded document...' : 'No document or symptom photo provided.', status: hasImage ? 'running' : 'skipped' },
      { stage: 'retrieval', title: 'Searching reference medical index...', status: 'pending' },
      { stage: 'reasoning', title: 'Synthesizing symptom patterns and warning signs...', status: 'pending' },
      { stage: 'formatting', title: 'Formatting expert triage summary...', status: 'pending' }
    ];

    setLoadingStages(initialStages);
    setIsLoading(true);

    let currentStep = hasImage ? 0 : 1;
    let progress = 0;

    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);

    loadingIntervalRef.current = setInterval(() => {
      setLoadingStages(prev => {
        const next = [...prev];
        
        if (currentStep >= next.length) {
          if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
          return prev;
        }

        // Animate the active stage pulsing
        if (next[currentStep].status === 'running') {
          progress += 25;
          if (progress >= 100) {
            next[currentStep].status = 'completed';
            next[currentStep].title = getStepCompletedTitle(next[currentStep].stage);
            currentStep++;
            progress = 0;
            if (currentStep < next.length) {
              next[currentStep].status = 'running';
            }
          }
        } else if (next[currentStep].status === 'pending') {
          next[currentStep].status = 'running';
        } else if (next[currentStep].status === 'skipped') {
          currentStep++;
          if (currentStep < next.length) {
            next[currentStep].status = 'running';
          }
        }

        return next;
      });
    }, 800);
  };

  const getStepCompletedTitle = (stage: string) => {
    switch (stage) {
      case 'extraction': return 'Completed image extraction.';
      case 'retrieval': return 'Retrieved clinically verified reference texts.';
      case 'reasoning': return 'Finished step-by-step clinical analysis.';
      case 'formatting': return 'Created formatted triage report.';
      default: return 'Completed.';
    }
  };

  const stopLoadingAnimation = () => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoading) return;

    // Ensure session exists or create one lazily
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = `session_${Date.now()}`;
      try {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ id: sessionId })
        });
        setCurrentSessionId(sessionId);
      } catch (err) {
        console.error('Lazy session creation failed:', err);
        return;
      }
    }

    const messageId = `msg_${Date.now()}_user`;

    // Local state preview update to feel instant
    const localUserMessage: Message = {
      id: messageId,
      role: 'user',
      text: textToSend,
      image: selectedImage || undefined,
      timestamp: new Date().toISOString()
    };

    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, localUserMessage]
      } : null);
    } else {
      setCurrentSession({
        id: sessionId,
        messages: [localUserMessage],
        createdAt: new Date().toISOString()
      });
    }

    setInputText('');
    const originalImage = selectedImage;
    setSelectedImage(null);

    // Trigger sequential loading animations
    startLoadingAnimation(!!originalImage);

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          messageId,
          text: textToSend,
          image: originalImage,
          language: i18n.language
        })
      });

      stopLoadingAnimation();

      if (response.ok) {
        const result = await response.json();
        setCurrentSession(result.session);
        await fetchSessionList();
      } else {
        const errorData = await response.json();
        alert(`Triage Pipeline Error: ${errorData.error || 'Server calculation failed.'}`);
      }
    } catch (err) {
      stopLoadingAnimation();
      console.error('Error submitting symptom triage:', err);
      alert('Network failure contacting clinical analysis node. Please check your internet connection.');
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentView('landing');
  };

  // ----------------------------------------------------
  // ROUTING VIEWS CONTROL
  // ----------------------------------------------------
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-[#E0362F] animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Verifying Portal Access...</h2>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed mt-1 font-semibold">
          Establishing a secure HIPAA-compliant workspace session. Please wait.
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (currentView === 'signup') {
      return (
        <SignupPage 
          onSwitchToLogin={() => setCurrentView('login')}
          onBackToLanding={() => setCurrentView('landing')}
        />
      );
    }
    if (currentView === 'login') {
      return (
        <LoginPage 
          onSwitchToSignup={() => setCurrentView('signup')}
          onBackToLanding={() => setCurrentView('landing')}
        />
      );
    }
    return <LandingPage onGetStarted={() => setCurrentView('login')} />;
  }

  return (
    <div id="app-root" className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans">
      
      {/* Premium Header - Re-styled to match the elite studio look */}
      <header className="bg-white border-b border-slate-200 shrink-0 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('landing')}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Return to Landing"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="p-2 bg-[#0E0E0E] text-white rounded-xl shadow-sm">
              <HeartPulse className="w-5 h-5 text-[#E0362F]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">{t('consultationPortal')}</h1>
                <span className="text-[9px] font-bold text-[#E0362F] bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  {t('liveSession')}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Grounded Clinical Triage Engine • {t('activeUser')} <span className="font-bold text-slate-950">{patientName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Consultation view Language Toggle */}
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ta' : 'en')}
              className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all border border-slate-200 cursor-pointer uppercase font-mono"
            >
              {i18n.language === 'en' ? 'தமிழ்' : 'English'}
            </button>

            <button
              onClick={createNewSession}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all border border-slate-200 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('newConsultation')}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#E0362F] hover:bg-red-50 rounded-xl transition-all border border-red-100 cursor-pointer"
              title="Secure Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout with Grid Pattern Background */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-[radial-gradient(#111111_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Left Sidebar: Session History */}
        <aside className="w-64 border-r border-slate-200 bg-white hidden md:flex flex-col shrink-0 relative z-10">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#E0362F]" />
              {t('recentConsultations')}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {sessions.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-bold">{t('noSessions')}</p>
                <p className="text-[10px] text-slate-400">{t('firstSessionDesc')}</p>
              </div>
            ) : (
              sessions.map(s => {
                const isActive = s.id === currentSessionId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentSessionId(s.id)}
                    className={`w-full text-left p-3.5 rounded-xl text-xs transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-slate-950 border-slate-950 text-white font-semibold shadow-md'
                        : 'border-slate-200/60 text-slate-600 hover:bg-slate-50 hover:text-slate-950 bg-white'
                    }`}
                  >
                    <p className="truncate mb-1 font-semibold">{s.lastMessageText}</p>
                    <div className="flex items-center justify-between mt-1 text-[9px] opacity-85">
                      <span className="font-mono">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                      <span>
                        {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {sessions.length > 0 && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={clearAllHistory}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-[#E0362F] hover:text-white hover:bg-[#E0362F] rounded-xl transition-all border border-red-200 bg-white shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('clearRecords')}
              </button>
            </div>
          )}
        </aside>

        {/* Primary Content Panel */}
        <main className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden relative z-10">
          
          {/* Active Consultation Arena */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {!currentSession || currentSession.messages.length === 0 ? (
              // Empty State Welcome Screen (Stunning and Graphics-rich!)
              <div className="max-w-2xl mx-auto py-6 space-y-8">
                
                {/* Welcoming Patient Card */}
                <div className="border border-slate-200/80 bg-white p-6 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
                  {/* Floating 3D heart pulse icon */}
                  <div className="absolute right-4 top-4 w-14 h-14 opacity-10 pointer-events-none md:opacity-20 animate-float">
                    <img src="/3d_heart_pulse.png" alt="Heart Pulse" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 text-[#E0362F] rounded-xl shadow-sm border border-red-100">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        {t('helloPatient')}, {patientName}.
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold">
                        {t('selectTemplateDesc')}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-100 font-semibold">
                    {t('groundingKBDesc')}
                  </p>
                </div>

                {/* Templates List */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1 font-mono">
                    <Dna className="w-4 h-4 text-[#E0362F]" />
                    {t('preseededDiagnostics')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {suggestedTemplates.map((tmpl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputText(tmpl.text)}
                        className="text-left border border-slate-200/80 hover:border-[#E0362F] rounded-xl p-4 bg-white hover:bg-red-50/[0.02] hover:shadow-md transition-all group flex flex-col justify-between min-h-[140px] cursor-pointer"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#E0362F] transition-colors flex items-center justify-between">
                            <span>{tmpl.title}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E0362F] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </h4>
                          <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed italic font-medium">
                            "{tmpl.text}"
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-3 pt-2 border-t border-slate-100 uppercase tracking-wider font-mono">
                          {tmpl.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Active Conversation Thread
              <div className="max-w-3xl mx-auto space-y-6">
                {currentSession.messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Avatar Placeholder for AI */}
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-[#0E0E0E] text-white flex items-center justify-center shrink-0 shadow-sm border border-slate-800">
                          <HeartPulse className="w-4 h-4 text-[#E0362F]" />
                        </div>
                      )}

                      <div className={`space-y-2 max-w-[90%] ${isUser ? 'order-1' : 'order-2'}`}>
                        {/* Message content */}
                        {isUser ? (
                          <div className="bg-[#0E0E0E] text-white rounded-2xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 font-mono">
                              <User className="w-3 h-3 text-[#E0362F]" />
                              <span>{patientName}</span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                            {msg.image && (
                              <div className="border border-slate-800 rounded-xl overflow-hidden max-w-xs bg-black">
                                <img
                                  src={msg.image}
                                  alt="Attached diagnostic report"
                                  className="w-full h-auto max-h-48 object-cover opacity-90"
                                  referrerPolicy="no-referrer"
                                 />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Emergency SOS Banner mounted immediately above the Results Card */}
                            {msg.triageResult && msg.triageResult.urgencyLevel === 'Emergency' && (
                              <EmergencyBanner 
                                sessionId={currentSessionId} 
                                symptomSummary={msg.triageResult.explanation} 
                              />
                            )}
                            {msg.triageResult && <ResultCard result={msg.triageResult} />}
                            {msg.triageResult?.pipelineTrace && (
                              <PipelineTrace stages={msg.triageResult.pipelineTrace} />
                            )}
                          </div>
                        )}
                        
                        {/* Time stamp */}
                        <p className={`text-[10px] text-slate-400 font-mono ${isUser ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Real-time Loading Pipeline visualizer */}
                {isLoading && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E0362F] flex items-center justify-center shrink-0 animate-pulse border border-red-100">
                      <HeartPulse className="w-4 h-4" />
                    </div>
                    <div className="flex-1 max-w-xl">
                      <PipelineTrace stages={loadingStages} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Interactive Form Panel */}
          <div className="border-t border-slate-200 bg-white p-4 shrink-0 relative z-20 shadow-lg">
            <div className="max-w-3xl mx-auto space-y-3">
              {/* Image upload area */}
              <ImageUpload onImageSelected={setSelectedImage} />

              {/* Chat Input form */}
              <form onSubmit={(e) => handleSubmit(e)} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t('inputPlaceholder')}
                  disabled={isLoading}
                  className="flex-1 border border-slate-200 hover:border-slate-300 focus:border-[#E0362F] focus:ring-1 focus:ring-red-100 rounded-xl px-4 py-3.5 text-sm transition-all focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 bg-[#FAF9F6] text-slate-900 font-semibold"
                />

                {/* Microphone Speech to Text Integration */}
                <VoiceInput
                  onTranscript={(transcript) => setInputText(transcript)}
                  language={i18n.language as 'en' | 'ta'}
                  disabled={isLoading}
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="px-6 py-3.5 bg-slate-950 hover:bg-[#E0362F] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {t('triageButton')}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
