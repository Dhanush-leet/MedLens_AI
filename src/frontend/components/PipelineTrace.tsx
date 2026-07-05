import React from 'react';
import { PipelineStageTrace } from '../types';
import { 
  Sparkles, 
  Search, 
  BrainCircuit, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

interface Props {
  stages: PipelineStageTrace[];
}

export const PipelineTrace: React.FC<Props> = ({ stages }) => {
  const getStageIcon = (stageName: string, status: string) => {
    const iconClass = "w-4 h-4";
    
    if (status === 'running') {
      return <Loader2 className={`${iconClass} text-studio-red animate-spin`} />;
    }

    switch (stageName) {
      case 'extraction':
        return <Sparkles className={iconClass} />;
      case 'retrieval':
        return <Search className={iconClass} />;
      case 'reasoning':
        return <BrainCircuit className={iconClass} />;
      case 'formatting':
        return <FileText className={iconClass} />;
      default:
        return <CheckCircle2 className={iconClass} />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          card: 'bg-emerald-50/40 border-emerald-100 text-emerald-800',
          dot: 'bg-emerald-500',
          text: 'text-emerald-700'
        };
      case 'running':
        return {
          card: 'bg-red-50/20 border-red-200 text-studio-dark',
          dot: 'bg-studio-red animate-ping',
          text: 'text-studio-red'
        };
      case 'skipped':
        return {
          card: 'bg-slate-50 text-slate-400 border-slate-200/50 line-through',
          dot: 'bg-slate-300',
          text: 'text-slate-400'
        };
      case 'failed':
        return {
          card: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-600',
          text: 'text-rose-600'
        };
      default:
        return {
          card: 'bg-slate-50/50 text-slate-400 border-slate-200/40',
          dot: 'bg-slate-200',
          text: 'text-slate-400'
        };
    }
  };

  return (
    <div id="pipeline-trace-container" className="border border-slate-200 bg-white p-5 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
            RAG PIPELINE OBSERVER
          </span>
          <h4 className="text-xs font-bold text-studio-dark uppercase tracking-tight">
            Sequential Execution Audit Trail
          </h4>
        </div>
        <span className="text-[9px] font-bold text-studio-red bg-red-50 border border-red-100 px-2 py-0.5 rounded-full font-mono animate-pulse">
          OBSERVABILITY TRACE ACTIVE
        </span>
      </div>

      <div className="space-y-3">
        {stages.map((stage) => {
          const style = getStatusStyle(stage.status);
          return (
            <div
              key={stage.stage}
              className={`border rounded-xl p-3.5 transition-all duration-300 flex items-start gap-3 ${style.card}`}
            >
              <div className="mt-0.5 relative flex items-center justify-center">
                <span className={`w-2 h-2 rounded-full absolute ${style.dot}`} />
                <span className="w-2.5 h-2.5 rounded-full bg-transparent border border-white/20" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest font-mono opacity-80">
                    Stage: {stage.stage}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-90">
                    {getStageIcon(stage.stage, stage.status)}
                    <span className="text-[10px] font-bold capitalize font-mono">
                      {stage.status}
                    </span>
                  </div>
                </div>

                <p className="text-xs font-semibold leading-relaxed">
                  {stage.title}
                </p>

                {stage.durationMs !== undefined && (
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono font-medium pt-1">
                    <Clock className="w-3 h-3" />
                    <span>Telemetry time: {stage.durationMs}ms</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
