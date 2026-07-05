import React from 'react';
import { TriageResult } from '../types';
import { UrgencyBadge } from './UrgencyBadge';
import { AlertTriangle, ShieldCheck, HeartPulse, Stethoscope, ChevronDown } from 'lucide-react';

interface Props {
  result: TriageResult;
}

export const ResultCard: React.FC<Props> = ({ result }) => {
  return (
    <div id="triage-result-card" className="border border-slate-200 bg-white rounded-2xl shadow-md overflow-hidden space-y-0 transition-all hover:shadow-lg">
      
      {/* Visual Header Pill */}
      <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-50 text-studio-red rounded-lg">
            <HeartPulse className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
            CLINICAL TRIAGE OUTCOME
          </span>
        </div>
        <UrgencyBadge level={result.urgencyLevel} />
      </div>

      {/* Multimodal Extraction results if any */}
      {result.extractedData && (result.extractedData.medicines.length > 0 || result.extractedData.lab_values.length > 0 || result.extractedData.visible_symptoms.length > 0) && (
        <div className="p-4 bg-red-50/15 border-b border-slate-100 space-y-3">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
            Extracted Clinical Data (OCR)
          </span>
          <div className="flex flex-wrap gap-4 text-xs font-medium">
            {result.extractedData.document_type !== 'unclear' && (
              <span className="bg-studio-dark text-white text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                Doc type: {result.extractedData.document_type}
              </span>
            )}
            
            {result.extractedData.medicines.length > 0 && (
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Identified Meds:</span>
                <span className="text-slate-800 font-bold">{result.extractedData.medicines.join(', ')}</span>
              </div>
            )}
            
            {result.extractedData.lab_values.length > 0 && (
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Captured Labs:</span>
                <span className="text-slate-800 font-bold">
                  {result.extractedData.lab_values.map(l => `${l.name} (${l.value} ${l.unit})`).join(', ')}
                </span>
              </div>
            )}

            {result.extractedData.visible_symptoms.length > 0 && (
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Dermatological Signs:</span>
                <span className="text-slate-800 font-bold">{result.extractedData.visible_symptoms.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Core explanation */}
      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-mono">
            Pathological Summary
          </h4>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {result.explanation}
          </p>
        </div>

        {/* Warning flags/Red flags (CRITICAL) */}
        {result.redFlags && result.redFlags.length > 0 && (
          <div className="border border-red-100 bg-red-50/30 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-studio-red">
              <AlertTriangle className="w-4 h-4 animate-pulse shrink-0" />
              <span>Red Flags & Warning Signs to Monitor:</span>
            </div>
            <ul className="list-disc pl-4 text-xs text-red-950 space-y-1.5 font-semibold">
              {result.redFlags.map((flag, idx) => (
                <li key={idx} className="leading-relaxed">
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Specialist recommendation */}
        <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200/50 rounded-xl">
          <div className="p-2 bg-studio-dark text-white rounded-lg">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono font-extrabold">
              Recommended Care Path
            </span>
            <p className="text-xs font-bold text-studio-dark uppercase">
              {result.recommendedSpecialist}
            </p>
          </div>
        </div>

        {/* Safety Disclaimer (Serious, muted) */}
        <p className="text-[10px] text-slate-400 leading-relaxed font-mono font-semibold pt-2 border-t border-slate-100">
          * {result.disclaimer}
        </p>
      </div>
    </div>
  );
};
