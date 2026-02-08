import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../Button';
import { ArrowRight, Check, Sparkles, BrainCircuit, Target, ChevronRight } from 'lucide-react';

interface OnboardingSurveyProps {
  userName: string;
  onComplete: (data: { difficulties: string; expectations: string }) => void;
}

export const OnboardingSurvey: React.FC<OnboardingSurveyProps> = ({ userName, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [difficulties, setDifficulties] = useState('');
  const [expectations, setExpectations] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const minChars = 20;
  const isStep1Valid = difficulties.trim().length >= minChars;
  const isStep2Valid = expectations.trim().length >= minChars;

  const handleNext = () => {
    if (activeStep === 0 && isStep1Valid) {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveStep(1);
        setIsAnimating(false);
      }, 300);
    } else if (activeStep === 1 && isStep2Valid) {
      onComplete({ difficulties, expectations });
    }
  };

  const progress = activeStep === 0
    ? Math.min(100, (difficulties.length / minChars) * 50)
    : 50 + Math.min(50, (expectations.length / minChars) * 50);

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex items-center justify-center p-4 sm:p-6 font-sans overflow-hidden text-slate-200">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#020617]">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      <div className="relative w-full max-w-md bg-[#0f172a]/80 backdrop-blur-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col min-h-[500px]">

        {/* Sidebar / Header Area */}
        <div className="bg-gradient-to-br from-indigo-600/20 to-blue-600/20 p-6 flex flex-col border-b border-white/5">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/20 text-white shadow-lg">
              {activeStep === 0 ? <BrainCircuit size={24} /> : <Target size={24} />}
            </div>
            <h2 className="text-xl font-black text-white mb-2 tracking-tight">
              {activeStep === 0 ? 'Perfil de Estudo' : 'Seus Objetivos'}
            </h2>
            <p className="text-blue-200/80 text-sm leading-relaxed">
              {activeStep === 0
                ? `Olá, ${userName}! Para personalizar sua jornada, precisamos entender seus desafios atuais.`
                : 'Ótimo! Agora conte-nos o que você espera alcançar com nossa plataforma.'}
            </p>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest mb-2">
              Progresso
            </div>
            <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 flex flex-col relative">
          <div className={`flex-1 flex flex-col justify-center transition-all duration-300 ${isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>

            {activeStep === 0 ? (
              <div className="space-y-6">
                <label className="block text-lg font-bold text-white">
                  Quais são suas principais dificuldades ao estudar?
                </label>
                <div className="relative group">
                  <textarea
                    value={difficulties}
                    onChange={(e) => setDifficulties(e.target.value)}
                    placeholder="Ex: Tenho dificuldade em manter o foco por muito tempo e organizar meu cronograma de revisões..."
                    className="w-full h-48 bg-black/20 border border-white/10 rounded-2xl p-5 text-white placeholder-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none resize-none transition-all text-base leading-relaxed"
                    autoFocus
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 pointer-events-none">
                    <span className={`text-xs font-bold transition-colors ${isStep1Valid ? 'text-emerald-400' : 'text-white/30'}`}>
                      {difficulties.length} / {minChars}
                    </span>
                    {isStep1Valid && <Check size={14} className="text-emerald-400" />}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <label className="block text-lg font-bold text-white">
                  O que você espera desta plataforma?
                </label>
                <div className="relative group">
                  <textarea
                    value={expectations}
                    onChange={(e) => setExpectations(e.target.value)}
                    placeholder="Ex: Espero encontrar simulados realistas e um sistema que me ajude a identificar meus pontos fracos..."
                    className="w-full h-48 bg-black/20 border border-white/10 rounded-2xl p-5 text-white placeholder-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none resize-none transition-all text-base leading-relaxed"
                    autoFocus
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 pointer-events-none">
                    <span className={`text-xs font-bold transition-colors ${isStep2Valid ? 'text-emerald-400' : 'text-white/30'}`}>
                      {expectations.length} / {minChars}
                    </span>
                    {isStep2Valid && <Check size={14} className="text-emerald-400" />}
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleNext}
              disabled={activeStep === 0 ? !isStep1Valid : !isStep2Valid}
              className={`
                px-8 py-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center gap-3
                ${(activeStep === 0 ? isStep1Valid : isStep2Valid)
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 translate-y-0'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'}
              `}
            >
              {activeStep === 0 ? 'Continuar' : 'Finalizar Cadastro'}
              {activeStep === 0 ? <ChevronRight size={20} /> : <Sparkles size={20} />}
            </Button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
