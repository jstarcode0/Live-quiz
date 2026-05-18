import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, AlertTriangle, Terminal, ChevronDown, ChevronUp, Activity } from 'lucide-react';

interface WorkflowStep {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    error?: string;
    logs: string[];
    critical: boolean;
}

export default function WorkflowTracker() {
    const [status, setStatus] = useState<{ isRunning: boolean, steps: WorkflowStep[] }>({ isRunning: false, steps: [] });
    const [expandedStep, setExpandedStep] = useState<string | null>(null);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/stream/workflow/status');
            const data = await res.json();
            setStatus(data);
        } catch (e) {}
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    if (!status.isRunning && status.steps.length === 0) return null;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-2xl mb-6">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h3 className="font-bold text-white text-xs uppercase tracking-widest flex items-center gap-2">
                   <Activity className="w-4 h-4 text-cyan-500" /> STARTUP WORKFLOW {status.isRunning ? '(ACTIVE)' : '(READY)'}
                </h3>
                {status.isRunning && <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />}
            </div>

            <div className="divide-y divide-slate-800">
                {status.steps.map(step => (
                    <div key={step.id} className="flex flex-col">
                        <div 
                            className={`p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors ${step.status === 'running' ? 'bg-cyan-900/10' : ''}`}
                            onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                        >
                            <div className="flex items-center gap-3">
                                {step.status === 'pending' && <Circle className="w-4 h-4 text-slate-700" />}
                                {step.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />}
                                {step.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                {step.status === 'skipped' && <AlertTriangle className="w-4 h-4 text-orange-400" />}
                                {step.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                                
                                <div>
                                    <div className={`text-[11px] font-black uppercase tracking-tight ${step.status === 'running' ? 'text-cyan-400' : 'text-slate-300'}`}>
                                        {step.name}
                                    </div>
                                    {step.error && <div className="text-[9px] text-red-400 font-bold uppercase">{step.error}</div>}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {step.logs.length > 0 && <Terminal className="w-3 h-3 text-slate-600" />}
                                {expandedStep === step.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                            </div>
                        </div>

                        {expandedStep === step.id && step.logs.length > 0 && (
                            <div className="bg-black p-4 font-mono text-[10px] text-slate-400 border-t border-slate-800 break-all whitespace-pre-wrap">
                                {step.logs.join('\n')}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {status.steps.some(s => s.status === 'failed') && (
                <div className="p-3 bg-red-950/20 border-t border-red-900/50 flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase">
                    <AlertTriangle className="w-4 h-4" /> Workflow halted due to critical error.
                </div>
            )}
        </div>
    );
}
