import React, { useState, useEffect } from 'react';
import { Phone, ShieldAlert, Users, CheckCircle, Loader2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmergencyContact } from '../types';
import { useAuth } from './AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';


interface Props {
  sessionId: string;
  symptomSummary: string;
}

export const EmergencyBanner: React.FC<Props> = ({ sessionId, symptomSummary }) => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [contact, setContact] = useState<EmergencyContact | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  
  // Setup Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relation, setRelation] = useState('');
  const [consent, setConsent] = useState(false);
  
  // Loading & Alert State
  const [loading, setLoading] = useState(false);
  const [alertStatus, setAlertStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [setupError, setSetupError] = useState<string | null>(null);

  // Fetch registered contact for this session on mount
  useEffect(() => {
    fetchContact();
  }, [sessionId]);

  const fetchContact = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/emergency-contact/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setContact(data);
        setShowSetup(false);
      } else {
        setShowSetup(true);
      }
    } catch (err) {
      console.error('Error fetching emergency contact:', err);
      setShowSetup(true);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !relation) {
      setSetupError('Please fill in Name, Phone and Relationship.');
      return;
    }
    if (!consent) {
      setSetupError('You must check the consent box to continue.');
      return;
    }

    setLoading(true);
    setSetupError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/emergency-contact`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          name,
          phone,
          email: email || undefined,
          relation,
          consentGivenAt: new Date().toISOString()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setContact(data.contact);
        setShowSetup(false);
      } else {
        const errorData = await res.json();
        setSetupError(errorData.error || 'Failed to save emergency contact.');
      }
    } catch (err) {
      console.error('Error saving emergency contact:', err);
      setSetupError('Network error. Failed to save contact.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSOS = async () => {
    if (!contact) return;
    setAlertStatus('sending');

    try {
      const res = await fetch(`${API_BASE_URL}/api/emergency-alert`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          summary: symptomSummary
        })
      });

      if (res.ok) {
        setAlertStatus('success');
      } else {
        setAlertStatus('error');
      }
    } catch (err) {
      console.error('Error sending SOS alert:', err);
      setAlertStatus('error');
    }
  };

  return (
    <div className="w-full bg-[#F7DEDB] border-2 border-[#E0362F] rounded-2xl p-5 md:p-6 shadow-sm space-y-5 text-[#0E0E0E] relative overflow-hidden">
      {/* Visual background highlight accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#E0362F]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start gap-4">
        <div className="p-3 bg-red-100 text-[#E0362F] rounded-xl shrink-0 shadow-sm border border-red-200">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#E0362F] flex items-center gap-1.5">
            <span>{t('emergencyWarningTitle')}</span>
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed font-semibold">
            {t('disclaimer')}
          </p>
        </div>
      </div>

      {/* Primary Emergency Actions Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* Calling Local EMS is always FIRST and LARGEST */}
        <a
          href="tel:108"
          className="flex items-center justify-center gap-2.5 px-6 py-4 bg-[#E0362F] hover:bg-[#0E0E0E] text-white rounded-xl font-black text-xs tracking-wider uppercase shadow-md transition-all text-center hover:scale-[1.02] cursor-pointer"
        >
          <Phone className="w-4 h-4 animate-bounce" />
          <span>{t('callEmergencyNow')} (108 / 112)</span>
        </a>

        {/* SOS Contact alert panel */}
        <div className="border border-[#D8D5CC] bg-white/70 p-4 rounded-xl flex flex-col justify-center min-h-[60px] shadow-inner backdrop-blur-sm">
          {showSetup ? (
            <button
              onClick={() => setShowSetup(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-[#D8D5CC] hover:border-[#E0362F] hover:text-[#E0362F] text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>{t('setupContact')}</span>
            </button>
          ) : (
            contact && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                  <span>CONTACT: {contact.name} ({contact.relation})</span>
                  <button
                    onClick={() => setShowSetup(true)}
                    className="text-[#E0362F] hover:underline font-bold cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
                {alertStatus === 'success' ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                    <CheckCircle className="w-4 h-4 animate-pulse" />
                    <span>{t('sosAlertSent')}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSendSOS}
                    disabled={alertStatus === 'sending'}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0E0E0E] hover:bg-[#E0362F] disabled:bg-slate-400 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    {alertStatus === 'sending' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('sendingSos')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('notifyContact')}</span>
                      </>
                    )}
                  </button>
                )}
                {alertStatus === 'error' && (
                  <span className="text-[10px] text-red-600 font-bold text-center mt-1">
                    {t('sosAlertFailed')}
                  </span>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Setup Form (Toggleable or Visible) */}
      {showSetup && (
        <form onSubmit={handleSaveContact} className="bg-white border border-[#D8D5CC] rounded-xl p-4 space-y-4 shadow-inner">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
              {t('setupContact')}
            </h4>
          </div>

          {setupError && (
            <div className="p-2.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 animate-shake">
              {setupError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                {t('contactNameLabel')} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-[#FAF9F6] border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#E0362F]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                {t('contactPhoneLabel')} *
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full bg-[#FAF9F6] border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#E0362F]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                {t('contactRelationLabel')} *
              </label>
              <input
                type="text"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="Spouse / Friend"
                className="w-full bg-[#FAF9F6] border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#E0362F]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
              Contact Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full bg-[#FAF9F6] border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#E0362F]"
            />
          </div>

          <div className="flex items-start gap-2.5 pt-2">
            <input
              type="checkbox"
              id="consent-check"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <label htmlFor="consent-check" className="text-[10px] font-semibold text-slate-500 cursor-pointer leading-relaxed select-none">
              {t('consentCheckbox')}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            {contact && (
              <button
                type="button"
                onClick={() => setShowSetup(false)}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#0E0E0E] hover:bg-[#E0362F] disabled:bg-slate-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t('saveContactBtn')}</span>
            </button>
          </div>
        </form>
      )}

      {/* Footnote instruction */}
      <div className="flex gap-2 items-center text-[10px] text-slate-500 border-t border-[#D8D5CC] pt-3">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <p className="italic">
          * Note: Alert notifications will try to send an email/SMS using our backend notify services, but you should always call local emergency dispatch immediately first.
        </p>
      </div>
    </div>
  );
};
