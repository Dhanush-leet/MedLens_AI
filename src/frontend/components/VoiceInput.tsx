import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  onTranscript: (text: string) => void;
  language: 'en' | 'ta';
  disabled?: boolean;
}

export const VoiceInput: React.FC<Props> = ({ onTranscript, language, disabled }) => {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError('Permission denied');
      } else {
        setError('Error listening');
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognitionRef.current = recognition;
  }, [onTranscript]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  };

  if (!supported) return null;

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        disabled={disabled}
        onClick={toggleListening}
        className={`relative p-3.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
          isListening
            ? 'bg-[#E0362F] border-[#E0362F] text-white shadow-md shadow-red-200'
            : 'bg-[#FAF9F6] border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
        title={isListening ? t('listening') : t('Microphone')}
      >
        <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse scale-110' : ''}`} />

        <AnimatePresence>
          {isListening && (
            <>
              {/* Outer pulsing ring 1 */}
              <motion.span
                className="absolute inset-0 rounded-xl bg-[#E0362F]/30 pointer-events-none"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              />
              {/* Outer pulsing ring 2 */}
              <motion.span
                className="absolute inset-0 rounded-xl bg-[#E0362F]/20 pointer-events-none"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 2.4, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, delay: 0.4, repeat: Infinity, ease: 'easeOut' }}
              />
            </>
          )}
        </AnimatePresence>
      </button>

      {error && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-800 text-white text-[10px] font-mono rounded shadow-lg flex items-center gap-1 whitespace-nowrap z-50">
          <AlertCircle className="w-3 h-3 text-red-400" />
          {error === 'Permission denied' ? 'Microphone blocked' : 'Mic error'}
        </span>
      )}
    </div>
  );
};
