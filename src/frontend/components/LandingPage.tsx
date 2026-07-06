import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  Lock, 
  Activity, 
  Sparkles, 
  Database, 
  FileText, 
  Eye, 
  AlertCircle 
} from 'lucide-react';
import { HeroParticlePortrait } from './HeroParticlePortrait';
import { PipelineCard3D } from './PipelineCard3D';
import { useTranslation } from 'react-i18next';

interface Props {
  onGetStarted: () => void;
}

// Health-tech company logos for the trusted badge hover panel
const TRUSTED_COMPANIES = [
  { name: 'Apollo', abbr: 'APO', color: '#1A5276', bg: '#D6EAF8' },
  { name: 'Practo', abbr: 'PRC', color: '#1A7A4A', bg: '#D5F5E3' },
  { name: 'Niramai', abbr: 'NIR', color: '#6C3483', bg: '#E8DAEF' },
  { name: 'Mfine', abbr: 'MFN', color: '#B7470A', bg: '#FDEBD0' },
  { name: 'Siemens', abbr: 'SIE', color: '#1B4F72', bg: '#D6EAF8' },
  { name: 'Philips', abbr: 'PHI', color: '#7B241C', bg: '#FADBD8' },
];

const TrustedBadge: React.FC = () => {
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation();

  return (
    <div
      className="pointer-events-auto mt-8 relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover-expand company logos panel — slides up above the badge */}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={hovered ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-full left-0 mb-3 z-50 pointer-events-none"
        style={{ minWidth: '280px' }}
      >
        <div className="bg-white border border-[#D8D5CC] rounded-2xl shadow-xl p-4 space-y-3">
          <p className="text-[9px] font-mono font-black text-[#6B6960] uppercase tracking-widest">
            {t('trustedCompanies')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TRUSTED_COMPANIES.map((co) => (
              <div
                key={co.name}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-[#F0EDE8] hover:border-[#D8D5CC] transition-colors"
                style={{ background: co.bg + '66' }}
              >
                {/* Brand initial avatar */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-[11px] shadow-sm"
                  style={{ background: co.bg, color: co.color, border: `1.5px solid ${co.color}22` }}
                >
                  {co.abbr}
                </div>
                <span className="text-[9px] font-bold text-[#3A3A3A] tracking-wide text-center leading-tight">
                  {co.name}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 pt-1 border-t border-[#F0EDE8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[9px] font-mono text-[#6B6960] font-semibold">
              {t('activePartnerships')}
            </span>
          </div>
        </div>
        {/* Arrow pointing down to badge */}
        <div className="flex justify-start pl-5">
          <div className="w-3 h-3 bg-white border-r border-b border-[#D8D5CC] rotate-45 -mt-1.5 shadow-sm" />
        </div>
      </motion.div>

      {/* The badge pill itself */}
      <motion.div
        animate={hovered ? { scale: 1.04, backgroundColor: '#0E0E0E' } : { scale: 1, backgroundColor: '#F7DEDB' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer select-none"
        style={{ color: hovered ? '#FFFFFF' : '#E0362F' }}
      >
        <span className="flex -space-x-1.5">
          {TRUSTED_COMPANIES.slice(0, 3).map((co, i) => (
            <span
              key={co.name}
              className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[7px] font-black"
              style={{ background: co.color, color: '#fff', zIndex: 3 - i }}
            >
              {co.abbr[0]}
            </span>
          ))}
        </span>
        <span>{t('trustedBadge')}</span>
        <motion.span
          animate={hovered ? { rotate: 180 } : { rotate: 0 }}
          transition={{ duration: 0.22 }}
          className="text-[8px]"
        >
          ▲
        </motion.span>
      </motion.div>
    </div>
  );
};

export const LandingPage: React.FC<Props> = ({ onGetStarted }) => {
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState<'text' | 'photo' | 'prescription' | 'labs'>('text');
  const [activeStep, setActiveStep] = useState<number>(1);

  // Toggle Language Handler
  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'ta' : 'en';
    i18n.changeLanguage(nextLang);
  };

  // Pipeline Stages for MedLens AI
  const PIPELINE_STAGES = [
    {
      step: '01',
      title: t('textOnlyCheck'),
      description: t('textOnlyDesc'),
      detail: 'OCR & Vision Model Analysis'
    },
    {
      step: '02',
      title: t('photoRash'),
      description: t('photoRashDesc'),
      detail: 'Qdrant Vector RAG Grounding'
    },
    {
      step: '03',
      title: t('prescriptionPhoto'),
      description: t('prescriptionPhotoDesc'),
      detail: 'Strict Safety Pre-processing'
    },
    {
      step: '04',
      title: t('labReportUpload'),
      description: t('labReportDesc'),
      detail: 'Explainable Clinical Report'
    }
  ];

  // Custom motion container variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);



  return (
    <div id="landing-page" ref={containerRef} className="bg-[#F3F1EC] min-h-screen text-[#0E0E0E] relative overflow-x-hidden flex flex-col selection:bg-[#E0362F] selection:text-white">
      {/* Brutalist Grid overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#0E0E0E_1.5px,transparent_1.5px)] [background-size:24px_24px] z-0" />
      <style>{`
        .bg-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
      `}</style>



      {/* 2.1 Navbar - Floating Round Dark Pill */}
      <div className="fixed top-6 left-0 right-0 w-full max-w-5xl mx-auto px-4 z-50">
        <header className="bg-[#0E0E0E] text-white rounded-full px-6 py-3 flex items-center justify-between shadow-lg border border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#E0362F] animate-pulse" />
            <span className="font-mono text-xs font-black tracking-widest uppercase text-white">
              {t('appName')}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[10px] font-mono font-bold tracking-wider uppercase text-white/70">
            <a href="#pipeline" className="hover:text-white transition-colors">{t('pipeline')}</a>
            <a href="#usecases" className="hover:text-white transition-colors">{t('useCases')}</a>
            <a href="#safety" className="hover:text-white transition-colors">{t('safety')}</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="px-3.5 py-1.5 border border-white/20 hover:border-white/50 hover:bg-white/10 rounded-full text-[10px] font-mono font-bold uppercase transition-all cursor-pointer text-white"
            >
              {i18n.language === 'en' ? 'தமிழ்' : 'English'}
            </button>

            <button
              onClick={onGetStarted}
              className="flex items-center gap-1.5 bg-[#E0362F] hover:bg-white hover:text-[#0E0E0E] text-white px-4.5 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <span>{t('tryDemo')}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </header>
      </div>

      {/* 2.2 Hero Area inside a bordered card frame */}
      <main className="max-w-7xl w-full mx-auto px-4 pt-28 pb-12 md:py-32 flex-1 flex flex-col justify-center relative z-20">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="border border-[#D8D5CC] rounded-[24px] bg-white p-8 md:p-12 relative shadow-sm"
        >
          {/* Main Hero grid layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative min-h-[480px]">
            
            {/* Portrait image — centered, sits BEHIND the text */}
            <div className="absolute inset-x-0 bottom-0 flex justify-center z-0 pointer-events-none" style={{ top: '-8%' }}>
              <HeroParticlePortrait />
            </div>

            {/* Large display text — sits ON TOP of the portrait */}
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none z-10 leading-none mix-blend-multiply">
              <h1
                className="font-display-condensed uppercase text-[#0E0E0E] tracking-tight leading-none text-center w-full px-2"
                style={{ fontSize: 'clamp(3rem, 14.5vw, 17rem)', fontStretch: 'condensed', letterSpacing: '-0.03em' }}
              >
                MEDLENS
              </h1>
              <h1
                className="font-display-condensed uppercase text-[#E0362F] tracking-tight leading-none text-center w-full px-2 -mt-1"
                style={{ fontSize: 'clamp(2.8rem, 13.5vw, 16rem)', fontStretch: 'condensed', letterSpacing: '-0.03em' }}
              >
                AI TRIAGE
              </h1>
            </div>

            {/* Left copy column */}
            <div className="lg:col-span-4 relative z-20 pointer-events-none flex flex-col justify-between h-full min-h-[200px] md:min-h-[280px]">
              <div className="pointer-events-auto max-w-[280px]">
                <p className="text-xs text-[#6B6960] leading-relaxed font-semibold">
                  {t('heroTagline')}
                </p>
              </div>
              <TrustedBadge />
            </div>

            {/* Empty space to let portrait show */}
            <div className="lg:col-span-4 h-full pointer-events-none"></div>

            {/* Right copy column */}
            <div className="lg:col-span-4 relative z-30 pointer-events-none flex flex-col justify-end items-end h-full min-h-[200px] md:min-h-[280px] text-right">
              <div className="pointer-events-auto mt-8">
                <span className="serif-italic text-lg md:text-xl font-normal tracking-tight text-[#0E0E0E] leading-tight block max-w-[260px]">
                  "See the reasoning, not just the answer."
                </span>
              </div>
            </div>

          </div>
        </motion.div>
      </main>

      {/* 2.3 Logo / Trust Strip */}
      <section className="bg-transparent py-10 overflow-hidden flex flex-col items-center z-10 border-t border-b border-[#D8D5CC]/60 bg-[#FAF9F6]/40">
        <div className="inline-block bg-[#F7DEDB] text-[#E0362F] px-3.5 py-1.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest mb-6">
          {t('poweredBy')}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60 hover:opacity-100 transition-opacity duration-300">
          {['Gemini 3.5 Flash', 'MongoDB', 'Twilio Alert', 'Docker', 'React'].map((logo) => (
            <span key={logo} className="font-mono text-xs font-black text-[#6B6960] hover:text-[#E0362F] transition-colors cursor-default uppercase">
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* 2.4 & 2.5 Secondary Intro Block & Stats Bar */}
      <section className="max-w-7xl w-full mx-auto px-4 py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        <div className="lg:col-span-5 space-y-6">
          <span className="font-mono text-xs font-bold tracking-widest uppercase text-[#E0362F] bg-[#F7DEDB] px-3.5 py-1.5 rounded-full">
            {t('clinicalDetector')}
          </span>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-[#0E0E0E] tracking-tight leading-tight">
            {t('builtForTrust')} <br /><span className="serif-italic">{t('notJustSpeed')}</span>
          </h2>
          <p className="text-xs text-[#6B6960] leading-relaxed font-semibold max-w-md">
            {t('introDescription')}
          </p>
        </div>

        {/* 2.5 Stats and Duotone Bust Graphic */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Stats Column with Floating DNA Helix */}
          <div className="md:col-span-6 space-y-8 text-left relative overflow-visible">
            {/* 3D DNA Helix Floating background detail */}
            <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-32 h-32 opacity-10 pointer-events-none md:opacity-20 animate-float">
              <img src="/3d_dna_helix.png" alt="3D DNA" className="w-full h-full object-contain" />
            </div>

            <div>
              <span className="text-4xl md:text-5xl font-display-condensed text-[#E0362F] leading-none block">4-STAGE</span>
              <span className="text-[10px] font-mono text-[#6B6960] uppercase tracking-wider block mt-1">{t('fourStagePipeline')}</span>
            </div>
            <div>
              <span className="text-4xl md:text-5xl font-display-condensed text-[#0E0E0E] leading-none block">100+</span>
              <span className="text-[10px] font-mono text-[#6B6960] uppercase tracking-wider block mt-1">{t('verifiedSources')}</span>
            </div>
            <div>
              <span className="text-4xl md:text-5xl font-display-condensed text-[#0E0E0E] leading-none block">&lt; 10s</span>
              <span className="text-[10px] font-mono text-[#6B6960] uppercase tracking-wider block mt-1">{t('avgResponse')}</span>
            </div>
          </div>

          {/* Real App Screenshot — duotone treated */}
          <div className="md:col-span-6 h-[280px] border border-[#D8D5CC] rounded-[20px] overflow-hidden relative shadow-sm group cursor-pointer" onClick={onGetStarted}>
            <img
              src="/app-triage.png"
              alt="MedLens AI clinical triage output screenshot"
              className="w-full h-full object-cover object-top grayscale group-hover:grayscale-0 transition-all duration-700"
              style={{ filter: 'grayscale(1) contrast(1.1) brightness(0.95)' }}
            />
            <div className="absolute inset-0 bg-[#E0362F]/8 mix-blend-multiply pointer-events-none rounded-[20px]" />
            <div className="absolute bottom-3 right-3 bg-[#0E0E0E]/80 text-white text-[9px] font-mono font-bold px-2.5 py-1.5 rounded-lg uppercase tracking-wider">
              {t('liveResult')}
            </div>
          </div>
        </div>
      </section>

      {/* 2.6 The Pipeline Section - Horizontal 3D-Tilt Cards */}
      <section id="pipeline" className="bg-[#FAF9F6] border-t border-b border-[#D8D5CC] py-20 relative z-10">
        <div className="max-w-7xl w-full mx-auto px-4 space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold tracking-widest uppercase text-[#E0362F] bg-[#F7DEDB] px-3.5 py-1.5 rounded-full inline-block">
                {t('howItThinks')}
              </span>
              <h3 className="font-serif text-3xl md:text-5xl font-normal text-[#0E0E0E] tracking-tight">
                {t('fourStepsTitle')} <span className="serif-italic">{t('actuallySee')}</span>
              </h3>
              <p className="text-xs text-[#6B6960] max-w-xl font-semibold">
                {t('pipelineDescription')}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[#F3F1EC] border border-[#D8D5CC] px-4 py-2 rounded-full h-fit">
              <span className="font-mono text-[10px] font-bold text-[#6B6960] uppercase">{t('progressControl')}</span>
              <span className="text-[10px] font-mono text-[#E0362F] font-black">{`{${activeStep}/4}`}</span>
            </div>
          </div>

          {/* Grid containing tilting 3D cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PIPELINE_STAGES.map((stage, idx) => (
              <PipelineCard3D
                key={idx}
                step={stage.step}
                title={stage.title}
                description={stage.description}
                detail={stage.detail}
                onHoverState={(hovered) => {
                  if (hovered) {
                    setActiveStep(idx + 1);
                  }
                }}
              />
            ))}
          </div>

        </div>
      </section>

      {/* 2.65 App Preview Section — real interface screenshots */}
      <section className="max-w-7xl w-full mx-auto px-4 py-16 z-10 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="font-mono text-xs font-bold tracking-widest uppercase text-[#E0362F] bg-[#F7DEDB] px-3.5 py-1.5 rounded-full inline-block">
              LIVE INTERFACE PREVIEW
            </span>
            <h3 className="font-serif text-2xl md:text-3xl font-normal text-[#0E0E0E] tracking-tight">
              The portal, <span className="serif-italic">exactly as you\'ll use it.</span>
            </h3>
          </div>
          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0E0E0E] text-white text-xs font-bold rounded-xl tracking-wide uppercase transition-all hover:bg-[#E0362F] cursor-pointer shrink-0"
          >
            <span>{t('enterGateway')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Two-panel app showcase grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">

          {/* Left — Consultation portal listing (wider) */}
          <div
            className="md:col-span-7 rounded-[20px] overflow-hidden border border-[#D8D5CC] shadow-md relative group cursor-pointer"
            onClick={onGetStarted}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E0E]/60 via-transparent to-transparent z-10 pointer-events-none" />
            <img
              src="/app-portal-raw.png"
              alt="MedLens AI consultation portal showing pre-seeded diagnostic patterns"
              className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-700"
              style={{ minHeight: '320px', maxHeight: '380px' }}
            />
            <div className="absolute bottom-5 left-5 z-20">
              <span className="font-mono text-[9px] text-white/60 uppercase tracking-widest block">STEP 1 OF 4 — INTAKE</span>
              <p className="text-sm font-black text-white uppercase tracking-wider mt-1">Clinical Consultation Portal</p>
              <p className="text-[11px] text-white/70 font-medium mt-0.5 max-w-[280px]">Select a pre-seeded diagnostic template or describe symptoms in natural language.</p>
            </div>
          </div>

          {/* Right — Triage result card (narrower, taller) */}
          <div
            className="md:col-span-5 rounded-[20px] overflow-hidden border border-[#D8D5CC] shadow-md relative group cursor-pointer"
            onClick={onGetStarted}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#E0362F]/50 via-transparent to-transparent z-10 pointer-events-none" />
            <img
              src="/app-triage-raw.png"
              alt="MedLens AI emergency triage clinical outcome with red flag warnings"
              className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-700"
              style={{ minHeight: '320px', maxHeight: '380px' }}
            />
            <div className="absolute bottom-5 left-5 z-20">
              <div className="inline-flex items-center gap-1.5 bg-[#E0362F] px-2.5 py-1 rounded-full mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="font-mono text-[9px] text-white font-bold uppercase tracking-widest">EMERGENCY</span>
              </div>
              <p className="text-sm font-black text-white uppercase tracking-wider">Triage Outcome Card</p>
              <p className="text-[11px] text-white/70 font-medium mt-0.5 max-w-[220px]">Explainable red flags, urgency level, and recommended care path.</p>
            </div>
          </div>
        </div>

        {/* Bottom strip — feature callouts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="border border-[#D8D5CC] bg-white rounded-2xl p-4 flex gap-3 items-start">
            <div className="w-2 h-2 rounded-full bg-[#E0362F] shrink-0 mt-1" />
            <div>
              <p className="text-xs font-black text-[#0E0E0E] uppercase tracking-wider">RAG Pipeline Observer</p>
              <p className="text-[11px] text-[#6B6960] mt-1 leading-relaxed">Full 4-stage execution trace is displayed alongside every result — not hidden in a black box.</p>
            </div>
          </div>
          <div className="border border-[#D8D5CC] bg-white rounded-2xl p-4 flex gap-3 items-start">
            <div className="w-2 h-2 rounded-full bg-[#0E0E0E] shrink-0 mt-1" />
            <div>
              <p className="text-xs font-black text-[#0E0E0E] uppercase tracking-wider">Pre-seeded Diagnostics</p>
              <p className="text-[11px] text-[#6B6960] mt-1 leading-relaxed">Test 4 clinical scenarios instantly: emergency, ophthalmic, dermatology, and UTI patterns.</p>
            </div>
          </div>
          <div className="border border-[#D8D5CC] bg-white rounded-2xl p-4 flex gap-3 items-start">
            <div className="w-2 h-2 rounded-full bg-[#E0362F] shrink-0 mt-1" />
            <div>
              <p className="text-xs font-black text-[#0E0E0E] uppercase tracking-wider">Emergency Override</p>
              <p className="text-[11px] text-[#6B6960] mt-1 leading-relaxed">Critical symptoms bypass the pipeline and trigger an immediate emergency escalation alert.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2.7 Use Cases Area */}
      <section id="usecases" className="max-w-7xl w-full mx-auto px-4 py-20 space-y-12 z-10">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="font-mono text-xs font-bold tracking-widest uppercase text-[#E0362F] bg-[#F7DEDB] px-3.5 py-1.5 rounded-full inline-block">
            {t('onePipelineTag')}
          </span>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-[#0E0E0E] tracking-tight">
            {t('useCaseTitle')} <br /><span className="serif-italic">{t('toFullReport')}</span>
          </h2>
          <p className="text-xs text-[#6B6960] leading-relaxed font-semibold">
            {t('useCaseDescription')}
          </p>
        </div>

        {/* 4 circular step badges + custom generated 3D images inside cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            onClick={() => setActiveTab('text')}
            className={`p-6 rounded-3xl border transition-all cursor-pointer text-center space-y-5 ${
              activeTab === 'text' 
                ? 'bg-[#E0362F] border-[#E0362F] text-white shadow-lg scale-[1.02]' 
                : 'bg-white border-[#D8D5CC] text-[#0E0E0E] hover:border-[#E0362F]'
            }`}
          >
            {/* 3D Image Icon */}
            <div className="h-16 flex items-center justify-center">
              <img 
                src="/3d_chat_consult.png" 
                alt="Text Consult" 
                className="w-14 h-14 object-contain animate-float"
              />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-wider uppercase">{t('textOnlyCheck')}</h4>
              <p className={`text-[10px] mt-1.5 leading-relaxed font-semibold ${activeTab === 'text' ? 'text-white/80' : 'text-[#6B6960]'}`}>
                {t('textOnlyDesc')}
              </p>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('photo')}
            className={`p-6 rounded-3xl border transition-all cursor-pointer text-center space-y-5 ${
              activeTab === 'photo' 
                ? 'bg-[#E0362F] border-[#E0362F] text-white shadow-lg scale-[1.02]' 
                : 'bg-white border-[#D8D5CC] text-[#0E0E0E] hover:border-[#E0362F]'
            }`}
          >
            {/* 3D Image Icon */}
            <div className="h-16 flex items-center justify-center">
              <img 
                src="/3d_microscope.png" 
                alt="Rash Identification" 
                className="w-14 h-14 object-contain animate-float"
                style={{ animationDelay: '1.5s' }}
              />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-wider uppercase">{t('photoRash')}</h4>
              <p className={`text-[10px] mt-1.5 leading-relaxed font-semibold ${activeTab === 'photo' ? 'text-white/80' : 'text-[#6B6960]'}`}>
                {t('photoRashDesc')}
              </p>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('prescription')}
            className={`p-6 rounded-3xl border transition-all cursor-pointer text-center space-y-5 ${
              activeTab === 'prescription' 
                ? 'bg-[#E0362F] border-[#E0362F] text-white shadow-lg scale-[1.02]' 
                : 'bg-white border-[#D8D5CC] text-[#0E0E0E] hover:border-[#E0362F]'
            }`}
          >
            {/* 3D Image Icon */}
            <div className="h-16 flex items-center justify-center">
              <img 
                src="/3d_pills.png" 
                alt="Prescription scanner" 
                className="w-14 h-14 object-contain animate-float"
                style={{ animationDelay: '3s' }}
              />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-wider uppercase">{t('prescriptionPhoto')}</h4>
              <p className={`text-[10px] mt-1.5 leading-relaxed font-semibold ${activeTab === 'prescription' ? 'text-white/80' : 'text-[#6B6960]'}`}>
                {t('prescriptionPhotoDesc')}
              </p>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('labs')}
            className={`p-6 rounded-3xl border transition-all cursor-pointer text-center space-y-5 ${
              activeTab === 'labs' 
                ? 'bg-[#E0362F] border-[#E0362F] text-white shadow-lg scale-[1.02]' 
                : 'bg-white border-[#D8D5CC] text-[#0E0E0E] hover:border-[#E0362F]'
            }`}
          >
            {/* 3D Image Icon */}
            <div className="h-16 flex items-center justify-center">
              <img 
                src="/3d_lab_vials.png" 
                alt="Hematology Reader" 
                className="w-14 h-14 object-contain animate-float"
                style={{ animationDelay: '4.5s' }}
              />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-wider uppercase">{t('labReportUpload')}</h4>
              <p className={`text-[10px] mt-1.5 leading-relaxed font-semibold ${activeTab === 'labs' ? 'text-white/80' : 'text-[#6B6960]'}`}>
                {t('labReportDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive summary for selected channel */}
        <div className="bg-white border border-[#D8D5CC] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#F3F1EC] rounded-xl text-[#0E0E0E] shrink-0">
              <Activity className="w-5 h-5 text-[#E0362F]" />
            </div>
            <div>
              <span className="font-mono text-[9px] font-bold text-[#E0362F] block">{t('activeChannel')}</span>
              <p className="text-xs font-black text-[#0E0E0E] uppercase mt-0.5">
                {activeTab === 'text' && t('symptomTriageConsole')}
                {activeTab === 'photo' && t('clinicalVisualId')}
                {activeTab === 'prescription' && t('opticalPrescription')}
                {activeTab === 'labs' && t('hematologyLogReader')}
              </p>
            </div>
          </div>
          <button 
            onClick={onGetStarted}
            className="px-5 py-2.5 bg-[#0E0E0E] hover:bg-[#E0362F] text-white text-xs font-bold rounded-xl tracking-wide uppercase transition-colors shrink-0 cursor-pointer"
          >
            {t('testConsole')}
          </button>
        </div>
      </section>

      {/* 2.8 Safety / Disclaimer Section */}
      <section id="safety" className="bg-[#FAF9F6] border-t border-b border-[#D8D5CC] py-16 z-10">
        <div className="max-w-4xl mx-auto px-4 space-y-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#D8D5CC] rounded-full text-[9px] font-mono text-[#6B6960] font-bold uppercase">
            <Lock className="w-3 h-3" />
            <span>{t('safetyGuardrails')}</span>
          </div>
          <h3 className="font-serif text-2xl md:text-3xl font-normal text-[#0E0E0E] tracking-tight">
            {t('riskMitigationTitle')}
          </h3>
          <p className="text-xs text-[#6B6960] leading-relaxed max-w-xl mx-auto font-semibold">
            {t('riskMitigationDesc')}
          </p>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
            <div className="p-4 bg-white border border-[#D8D5CC] rounded-xl space-y-1.5">
              <span className="text-[9px] font-mono text-[#6B6960] font-black uppercase">{t('actionPlan')}</span>
              <p className="text-xs font-black text-[#0E0E0E] uppercase">{t('emergencyOverride')}</p>
              <p className="text-[10px] text-[#6B6960] leading-relaxed font-medium">{t('emergencyOverrideDesc')}</p>
            </div>
            <div className="p-4 bg-white border border-[#D8D5CC] rounded-xl space-y-1.5">
              <span className="text-[9px] font-mono text-[#6B6960] font-black uppercase">{t('dataLogging')}</span>
              <p className="text-xs font-black text-[#0E0E0E] uppercase">{t('zeroRetention')}</p>
              <p className="text-[10px] text-[#6B6960] leading-relaxed font-medium">{t('zeroRetentionDesc')}</p>
            </div>
            <div className="p-4 bg-white border border-[#D8D5CC] rounded-xl space-y-1.5">
              <span className="text-[9px] font-mono text-[#6B6960] font-black uppercase">{t('groundingCheck')}</span>
              <p className="text-xs font-black text-[#0E0E0E] uppercase">{t('vectorRetrieval')}</p>
              <p className="text-[10px] text-[#6B6960] leading-relaxed font-medium">{t('vectorRetrievalDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2.9 Dark Footer CTA Band */}
      <section className="bg-[#0E0E0E] text-white py-20 text-center relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#FAF9F6_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-2xl mx-auto px-4 space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-[9px] font-mono tracking-widest text-[#E0362F] font-bold">
            <Activity className="w-3.5 h-3.5" />
            <span>{t('appName')}</span>
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-normal tracking-tight">
            {t('tryOwnSymptoms')} <br /><span className="serif-italic">{t('ownSymptoms')}</span>
          </h2>
          <p className="text-xs text-white/50 leading-relaxed max-w-sm mx-auto font-medium">
            {t('gatewayDescription')}
          </p>
          <div className="pt-4">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-[#E0362F] hover:bg-white hover:text-[#0E0E0E] text-white text-xs font-bold rounded-xl tracking-wider uppercase transition-all transform hover:scale-[1.03] cursor-pointer shadow-lg shadow-[#E0362F]/10"
            >
              {t('enterGateway')}
            </button>
          </div>
        </div>
      </section>

      {/* Corporate footer */}
      <footer className="bg-white border-t border-[#D8D5CC] py-12 shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E0362F]" />
            <span className="text-[9px] font-mono font-black tracking-widest uppercase text-[#0E0E0E]">
              MEDLENS TECHNOLOGIES INC. © 2026
            </span>
          </div>
          <p className="text-[10px] text-[#6B6960] max-w-2xl mx-auto leading-relaxed font-semibold">
            {t('corporateFooter')}
          </p>
          <div className="flex justify-center gap-6 text-[9px] font-bold text-[#6B6960] tracking-wide uppercase font-mono">
            <span>{t('hipaaSecure')}</span>
            <span>•</span>
            <span>{t('fdaDisclaimer')}</span>
            <span>•</span>
            <span>{t('zeroData')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
