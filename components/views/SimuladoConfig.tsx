
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../Button';
import { DISCIPLINES_LIST, MOCK_USER_STATS } from '../../constants';
import { ArrowLeft, Zap, Trophy, Shuffle, Target, Award, List, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, TrendingUp, Check, Lock } from 'lucide-react';
import { Difficulty, SimuladoConfig as ConfigType, SimuladoMode, SimuladoPreset, UserStats } from '../../types';

interface Props {
  onBack: () => void;
  onStart: (config: ConfigType) => void;
  presets: SimuladoPreset[];
  userStats: UserStats;
  isUserVip?: boolean;
  isDevMode?: boolean;
}

export const SimuladoConfig: React.FC<Props> = ({ onBack, onStart, presets, userStats, isUserVip, isDevMode }) => {
  const [selectedMode, setSelectedMode] = useState<SimuladoMode | null>(() => {
    const saved = localStorage.getItem('lastSimuladoMode');
    if (saved) {
      localStorage.removeItem('lastSimuladoMode'); // Clear after reading
      return saved as SimuladoMode;
    }
    return null;
  });

  // States for 'Random' Mode
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty | 'Mixed'>('Mixed');

  // VIP Modal state
  const [showVipModal, setShowVipModal] = useState(false);

  const toggleDiscipline = (disc: string) => {
    if (selectedDisciplines.includes(disc)) {
      setSelectedDisciplines(selectedDisciplines.filter(d => d !== disc));
    } else {
      setSelectedDisciplines([...selectedDisciplines, disc]);
    }
  };

  const handleStartRandom = () => {
    onStart({
      mode: 'random',
      disciplines: selectedDisciplines.length > 0 ? selectedDisciplines : DISCIPLINES_LIST,
      questionCount,
      difficulty
    });
  };

  const handleStartPreset = (id: string, type: 'challenge' | 'exam') => {
    onStart({
      mode: type,
      presetId: id
    });
  };

  const getProgressStats = (type: 'challenge' | 'exam') => {
    const allPresets = presets.filter(p => p.type === type);
    const total = allPresets.length;

    const completedCount = allPresets.filter(p =>
      userStats.completedPresets && userStats.completedPresets.includes(p.id)
    ).length;

    const percentage = total === 0 ? 0 : Math.round((completedCount / total) * 100);

    return { total, completedCount, percentage };
  };

  const isExamUnlocked = (exam: SimuladoPreset, examOrder?: number): boolean => {
    const order = examOrder || exam.order;
    // Se não for exam/challenge com order, ou for a primeira, sempre desbloqueado
    if ((exam.type !== 'exam' && exam.type !== 'challenge') || !order || order === 1) return true;

    // Pegar todos os items do mesmo tipo e auto-atribuir ordem
    const allItems = presets
      .filter(p => p.type === exam.type && p.order)
      .map((item, index) => ({
        ...item,
        order: item.order || (index + 1)
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const previousItem = allItems.find(e => e.order === order - 1);

    if (!previousItem) return true;

    // Para desafios, verifica successfulPresets (precisa ter sucesso)
    // Para exams, continua verificando completedPresets (só precisa completar)
    if (exam.type === 'challenge') {
      return userStats.successfulPresets.includes(previousItem.id);
    } else {
      return userStats.completedPresets.includes(previousItem.id);
    }
  };

  const getPreviousExamNumber = (exam: SimuladoPreset): number | null => {
    if ((!exam.type.includes('exam') && exam.type !== 'challenge') || !exam.order || exam.order === 1) return null;
    return exam.order - 1;
  };

  // VIP Upgrade Modal
  const VipModal = () => createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowVipModal(false)}>
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-amber-500/20" onClick={(e) => e.stopPropagation()}>
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Trophy size={40} className="text-white" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">Desafio VIP</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Este desafio é exclusivo para membros VIP. Faça upgrade da sua conta para ter acesso a todos os desafios premium!
          </p>
          <div className="pt-4 space-y-2">
            <button
              onClick={() => {
                window.open('https://wa.me/931534795?text=Quero%20ser%20VIP', '_blank');
                setShowVipModal(false);
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-2xl uppercase text-sm shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
            >
              🏆 Seja VIP
            </button>
            <button
              onClick={() => setShowVipModal(false)}
              className="w-full py-2 text-gray-500 dark:text-gray-400 text-sm font-bold hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  const renderPresetList = (type: 'challenge' | 'exam') => {
    // Get and sort items, auto-assigning order to items without one
    let items = presets.filter(p => p.type === type);

    // Auto-assign order and sort items that have order field
    if (type === 'exam' || (type === 'challenge' && items.some(i => i.order))) {
      items = items.map((item, index) => ({
        ...item,
        order: item.order || (index + 1)
      })).sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    const { total, completedCount, percentage } = getProgressStats(type);
    const isExam = type === 'exam';
    const colorClass = isExam ? 'bg-yellow-400' : 'bg-red-400';

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="bg-brand-light dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4 relative z-10">
            {type === 'exam' ? <Trophy className="text-yellow-500" size={24} /> : <Target className="text-red-500" size={24} />}
            <h3 className="font-bold text-lg text-brand-dark dark:text-white">
              {type === 'exam' ? 'Provas Oficiais' : 'Desafios Temáticos'}
            </h3>
          </div>
          <div className="space-y-2 relative z-10">
            <div className="flex justify-between items-end text-xs font-bold uppercase text-brand-muted dark:text-gray-400">
              <span>Seu Progresso</span>
              <span>{completedCount} de {total}</span>
            </div>
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%`, backgroundColor: isExam ? '#FBBF24' : '#F87171' }} />
            </div>
          </div>
        </div>

        <h4 className="font-bold text-brand-muted dark:text-gray-400 text-xs uppercase ml-1">Disponíveis Agora</h4>
        <div className="space-y-3">
          {items.map(item => {
            const isCompleted = userStats.completedPresets.includes(item.id);
            const isSuccessful = userStats.successfulPresets?.includes(item.id) || false;
            const isUnlocked = isExamUnlocked(item);
            const prevExamNumber = getPreviousExamNumber(item);
            const minimumRate = item.minimumSuccessRate || 50;

            // VIP Lock: bloqueia se o item é VIP e usuário não é VIP
            const isVipLocked = item.isVip && !isUserVip;

            // Para desafios progressivos, verificar nível atingido
            const isProgressive = item.isProgressiveWithLevels;
            const levelReached = isProgressive ? userStats.progressiveLevelsReached?.[item.id] : null;
            const is100Complete = levelReached === '100%';

            return (
              <div key={item.id} className={`bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-neu flex flex-col gap-3 group border transition-all ${is100Complete ? 'border-yellow-400/50 bg-gradient-to-br from-yellow-50/50 to-transparent' :
                isCompleted ? 'border-brand-green/30 opacity-90' :
                  isVipLocked ? 'border-amber-500/30 opacity-70' :
                    !isUnlocked ? 'border-yellow-500/30 opacity-60' :
                      'border-transparent hover:border-brand-purple/20 dark:border-gray-700'
                }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-brand-dark dark:text-white text-lg flex items-center gap-2">
                      {isVipLocked && <Lock size={18} className="text-amber-500" />}
                      {!isVipLocked && !isUnlocked && <Lock size={18} className="text-yellow-500" />}
                      {item.title}
                      {item.isVip && <span className="text-xs font-bold text-amber-500 bg-amber-500/20 px-2 py-0.5 rounded">⭐ VIP</span>}
                      {is100Complete && <Award size={18} className="text-yellow-500" />}
                      {isSuccessful && !is100Complete && <CheckCircle2 size={16} className="text-brand-green" />}
                      {isCompleted && !isSuccessful && type === 'challenge' && !isProgressive && <AlertCircle size={16} className="text-yellow-500" />}
                      {item.order && <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">#{item.order}</span>}
                    </h4>
                    <p className="text-sm text-brand-muted dark:text-gray-400 mt-1">{item.description}</p>

                    {/* Mostrar nível atingido para desafios progressivos */}
                    {isProgressive && levelReached && (
                      <div className={`mt-2 text-xs font-bold flex items-center gap-1 ${is100Complete ? 'text-yellow-600 dark:text-yellow-400' :
                        isSuccessful ? 'text-green-600 dark:text-green-400' :
                          'text-orange-600 dark:text-orange-400'
                        }`}>
                        {is100Complete ? '🏆' : isSuccessful ? '✓' : '⚠️'}
                        {is100Complete ? 'Concluído 100%' : `Completou até: ${levelReached}`}
                      </div>
                    )}

                    {!isUnlocked && prevExamNumber && (
                      <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 font-bold flex items-center gap-1">
                        <AlertCircle size={14} />
                        {type === 'challenge'
                          ? isProgressive
                            ? `Complete o Desafio #${prevExamNumber} até "Médio Moderado" para desbloquear`
                            : `Complete o Desafio #${prevExamNumber} com pelo menos ${minimumRate}% de acertos para desbloquear`
                          : `Complete a Prova #${prevExamNumber} para desbloquear`
                        }
                      </div>
                    )}
                    {isCompleted && !isSuccessful && type === 'challenge' && !isProgressive && (
                      <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
                        <AlertCircle size={14} />
                        Refazer para atingir {minimumRate}% de acertos
                      </div>
                    )}
                    {isCompleted && !isSuccessful && isProgressive && levelReached && levelReached !== '100%' && (
                      <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
                        <AlertCircle size={14} />
                        Continue para atingir "Médio Moderado" e desbloquear o próximo
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-bold text-brand-purple bg-brand-purple/10 dark:bg-brand-purple/20 px-2 py-1 rounded">
                    {item.questionCount} Questões
                  </span>
                  <Button
                    className="px-6 py-2 h-10 text-sm"
                    variant={is100Complete ? 'secondary' : (isSuccessful || type === 'exam') ? 'secondary' : 'primary'}
                    onClick={() => (isDevMode || (!isVipLocked && isUnlocked)) ? handleStartPreset(item.id, type) : (isVipLocked ? setShowVipModal(true) : undefined)}
                    disabled={!isDevMode && !isVipLocked && !isUnlocked}
                  >
                    {isDevMode ? '🔧 DEV Testar' :
                      isVipLocked ? '⭐ Apenas VIP' :
                        !isUnlocked ? '🔒 Bloqueado' :
                          is100Complete ? 'Refazer 100%' :
                            isCompleted && isProgressive ? 'Continuar' :
                              isCompleted ? 'Refazer' :
                                'Iniciar'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRandomConfig = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-brand-light dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <Shuffle className="text-brand-green" size={24} />
          <h3 className="font-bold text-lg text-brand-dark dark:text-white">Modo Aleatório</h3>
        </div>
        <p className="text-sm text-brand-muted dark:text-gray-400">
          O sistema selecionará questões alternadas da base de dados com base nas suas preferências abaixo. Ótimo para treino diário!
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="font-semibold text-brand-dark dark:text-white">Disciplinas (Opcional)</h3>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES_LIST.map(disc => (
            <button
              key={disc}
              onClick={() => toggleDiscipline(disc)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 
                ${selectedDisciplines.includes(disc)
                  ? 'bg-brand-purple text-white shadow-lg'
                  : 'bg-brand-light dark:bg-gray-700 text-brand-muted dark:text-gray-300 shadow-neu'}`}
            >
              {disc}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-brand-dark dark:text-white">Quantidade</h3>
        <div className="flex flex-wrap gap-2 bg-brand-light dark:bg-gray-800 shadow-neu-inset rounded-xl p-2">
          {[5, 10, 20, 50, 100].map(count => (
            <button
              key={count}
              onClick={() => setQuestionCount(count)}
              className={`flex-1 min-w-[50px] py-2 rounded-lg text-sm font-medium transition-all ${questionCount === count ? 'bg-white dark:bg-gray-700 shadow-md text-brand-purple' : 'text-brand-muted dark:text-gray-400'
                }`}
            >
              {count}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 mb-20">
        <Button className="w-full py-4 text-lg shadow-xl" onClick={handleStartRandom}>
          Gerar Simulado
        </Button>
      </section>
    </div>
  );

  const renderModeSelection = () => {
    const challengeStats = getProgressStats('challenge');
    const examStats = getProgressStats('exam');

    return (
      <div className="grid gap-4 mt-1 animate-fade-in">
        <button
          onClick={() => setSelectedMode('challenge')}
          className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-neu flex items-start gap-4 transition-transform active:scale-95 border border-transparent hover:border-red-200 dark:border-gray-700 dark:hover:border-red-900 group relative overflow-hidden"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform flex-shrink-0">
            <Target size={28} />
          </div>
          <div className="text-left flex-1 w-full">
            <h3 className="text-lg font-bold text-brand-dark dark:text-white">Desafio</h3>
            <p className="text-xs text-brand-muted dark:text-gray-400 mt-1 mb-3">Simulados temáticos pré-definidos.</p>
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-red-400 h-full rounded-full" style={{ width: `${challengeStats.percentage}%` }} />
            </div>
          </div>
        </button>

        <button
          onClick={() => setSelectedMode('exam')}
          className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-neu flex items-start gap-4 transition-transform active:scale-95 border border-transparent hover:border-yellow-200 dark:border-gray-700 dark:hover:border-yellow-900 group relative overflow-hidden"
        >
          <div className="w-14 h-14 rounded-2xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 group-hover:scale-110 transition-transform flex-shrink-0">
            <Trophy size={28} />
          </div>
          <div className="text-left flex-1 w-full">
            <h3 className="text-lg font-bold text-brand-dark dark:text-white">Prova Oficial</h3>
            <p className="text-xs text-brand-muted dark:text-gray-400 mt-1 mb-3">Vale pontos para o Ranking Geral.</p>
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${examStats.percentage}%` }} />
            </div>
          </div>
        </button>

        <button
          onClick={() => setSelectedMode('random')}
          className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-neu flex items-center gap-4 transition-transform active:scale-95 border border-transparent hover:border-green-200 dark:border-gray-700 dark:hover:border-green-900 group"
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-light dark:bg-gray-700 flex items-center justify-center text-brand-green group-hover:scale-110 transition-transform flex-shrink-0">
            <Shuffle size={28} />
          </div>
          <div className="text-left flex-1">
            <h3 className="text-lg font-bold text-brand-dark dark:text-white">Aleatório</h3>
            <p className="text-xs text-brand-muted dark:text-gray-400 mt-1">Treino livre com base de dados.</p>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4 py-2">
        <Button variant="icon" onClick={() => selectedMode ? setSelectedMode(null) : onBack()}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold text-brand-dark dark:text-white">
          {!selectedMode ? 'Escolha o Modo' :
            selectedMode === 'challenge' ? 'Desafios' :
              selectedMode === 'exam' ? 'Provas do Ranking' : 'Configurar Aleatório'}
        </h1>
      </header>

      {!selectedMode && renderModeSelection()}
      {selectedMode === 'challenge' && renderPresetList('challenge')}
      {selectedMode === 'exam' && renderPresetList('exam')}
      {selectedMode === 'random' && renderRandomConfig()}

      {/* VIP Upgrade Modal */}
      {showVipModal && <VipModal />}
    </div>
  );
};
