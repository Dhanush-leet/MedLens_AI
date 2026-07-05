import React, { useState } from 'react';
import { ShieldCheck, HeartPulse, User, Mail, Lock, ChevronRight, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';

interface Props {
  onSwitchToLogin: () => void;
  onBackToLanding: () => void;
}

export const SignupPage: React.FC<Props> = ({ onSwitchToLogin, onBackToLanding }) => {
  const { t } = useTranslation();
  const { signup } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [langPreference, setLangPreference] = useState<'en' | 'ta'>('en');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all clinical credentials.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(name, email, password, langPreference);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="patient-signup-view" className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* Left column: Visual branding & details */}
        <div className="md:col-span-5 bg-[#0E0E0E] text-[#FAF9F6] p-8 flex flex-col justify-between relative overflow-hidden min-h-[400px]">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#FAF9F6_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="absolute top-[35%] right-[-30px] w-56 h-56 opacity-10 pointer-events-none md:opacity-20 animate-pulse">
            <div className="w-full h-full rounded-full border border-slate-700 flex items-center justify-center">
              <ShieldCheck className="w-20 h-20 text-[#E0362F]" />
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <button 
              onClick={onBackToLanding}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#FAF9F6] transition-colors uppercase tracking-wider font-bold cursor-pointer border-none bg-transparent"
            >
              {t('backToOverview')}
            </button>
            <div className="flex items-center gap-2.5 pt-6">
              <div className="p-2 bg-[#E0362F] text-[#FAF9F6] rounded-xl shadow-sm">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold uppercase tracking-widest text-xs text-white">
                {t('appName')}
              </span>
            </div>
          </div>
 
          <div className="space-y-3 relative z-10 my-8">
            <h2 className="font-serif text-2xl font-bold tracking-tight leading-tight">
              Create Clinical Profile
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Register your profile to enable personalized symptom tracking, medical history persistence, and custom triage routing.
            </p>
          </div>

          <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-500 relative z-10">
            <span className="flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E0362F]" />
              {t('hipaaCompliant')}
            </span>
            <span className="font-mono">v2.4.0</span>
          </div>
        </div>

        {/* Right column: Form */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-[#FAF9F6]/40">
          <div className="space-y-2 mb-6">
            <span className="text-xs font-bold text-[#E0362F] uppercase tracking-wider">
              Registration Portal
            </span>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Register Diagnostic Profile
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              Personalize your clinical experience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-[#E0362F] text-xs font-bold rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-white border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:border-[#E0362F] focus:ring-1 focus:ring-red-100 transition-all outline-none text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. patient@medlens.ai"
                  className="w-full bg-white border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:border-[#E0362F] focus:ring-1 focus:ring-red-100 transition-all outline-none text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-[#E0362F] focus:ring-1 focus:ring-red-100 transition-all outline-none text-slate-900 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-[#E0362F] focus:ring-1 focus:ring-red-100 transition-all outline-none text-slate-900 font-semibold"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Preferred Language
              </label>
              <div className="relative">
                <Languages className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <select
                  value={langPreference}
                  onChange={(e) => setLangPreference(e.target.value as 'en' | 'ta')}
                  className="w-full bg-white border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:border-[#E0362F] focus:ring-1 focus:ring-red-100 transition-all outline-none text-slate-900 appearance-none cursor-pointer"
                >
                  <option value="en">English (US)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 mt-2 bg-slate-950 hover:bg-[#E0362F] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Registering...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Trigger switch to Login page */}
          <div className="mt-5 text-center">
            <p className="text-xs text-slate-500 font-semibold">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-[#E0362F] hover:underline font-bold bg-transparent border-none cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
