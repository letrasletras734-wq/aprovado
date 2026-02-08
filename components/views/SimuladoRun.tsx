
import React, { useState, useEffect, useRef } from 'react';
import { Question, SimuladoSession } from '../../types';
import { Button } from '../Button';
import { ArrowLeft, Clock, CheckCircle, XCircle, Award, Home, HelpCircle, BookOpen } from 'lucide-react';
import { LatexRenderer } from '../LatexRenderer';

interface Props {
  session: SimuladoSession;
  onFinish: (results: SimuladoSession) => void;
  onAbort: () => void;
  onReportQuestion?: (question: Question) => void;
  isProgressive?: boolean;
  currentLevel?: string;
  onNextLevel?: (currentSession: SimuladoSession) => void;
  isLastLevel?: boolean;
  progressiveLevels?: { level: string; questions: Question[] }[];
}

export const SimuladoRun: React.FC<Props> = ({
  session: initialSession,
  onFinish,
  onAbort,
  onReportQuestion,
  isProgressive,
  currentLevel,
  onNextLevel,
  isLastLevel,
  progressiveLevels
}) => {
  const [session, setSession] = useState(initialSession);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState<number | null>(
    session.timeLimit ? session.timeLimit * 60 : null
  );
  const [reportedQuestions, setReportedQuestions] = useState<Set<string>>(new Set());
  const [showPhaseComplete, setShowPhaseComplete] = useState(false);
  const sessionForNextLevel = useRef<SimuladoSession | null>(null);
  const savedAnswerRef = useRef<number | null>(null);

  // State to store final answers when finishing (to avoid React async state issues)
  const [finalAnswers, setFinalAnswers] = useState<Record<string, number | string> | null>(null);

  // New State for Result Screen
  const [isResultView, setIsResultView] = useState(false);
  const [hasFinishedReading, setHasFinishedReading] = useState(false);

  // Debug logging
  console.log('SimuladoRun Debug:', {
    challengeSubType: session.challengeSubType,
    hasReadingContent: !!session.readingContent,
    readingContentLength: session.readingContent?.length || 0,
    hasFinishedReading,
    questionsCount: session.questions.length
  });

  const currentQuestion = session.questions.length > 0 ? session.questions[currentIndex] : null;
  const isLastQuestion = currentIndex === session.questions.length - 1;

  // Timer
  useEffect(() => {
    if (isResultView) return; // Stop timer on result view
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);

      if (remainingTime !== null) {
        setRemainingTime(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            // Auto-finish on time out
            const finishedSession = { ...session, endTime: Date.now(), isFinished: true };
            setSession(finishedSession);
            setIsResultView(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isResultView, remainingTime, session]);

  useEffect(() => {
    if (showPhaseComplete && onNextLevel && sessionForNextLevel.current) {
      const timer = setTimeout(() => {
        onNextLevel(sessionForNextLevel.current!);
        sessionForNextLevel.current = null;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showPhaseComplete, onNextLevel]);

  // Keep session ref updated with latest state
  useEffect(() => {
    if (isProgressive && !isLastLevel) {
      sessionForNextLevel.current = session;
    }
  }, [session, isProgressive, isLastLevel]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Fácil': return 'bg-green-500 text-white';
      case 'Moderado': return 'bg-emerald-500 text-white';
      case 'Médio': return 'bg-yellow-500 text-white';
      case 'Médio Moderado': return 'bg-orange-500 text-white';
      case 'Difícil': return 'bg-red-500 text-white';
      case 'Super Difícil': return 'bg-purple-500 text-white';
      default: return 'bg-brand-purple text-white';
    }
  };

  const handleSelect = (idx: number) => {
    if (showAnswer) return; // Previne múltiplas seleções
    setSelectedOption(idx);
    savedAnswerRef.current = idx;

    // Salva a resposta e mostra o feedback automaticamente
    const newAnswers = { ...session.answers, [currentQuestion.id]: idx };
    setSession(prev => ({ ...prev, answers: newAnswers }));
    setShowAnswer(true);
  };

  const handleReportQuestion = () => {
    if (!onReportQuestion) return;

    const questionId = currentQuestion.id;
    if (reportedQuestions.has(questionId)) {
      alert('Você já reportou esta questão!');
      return;
    }

    const confirmed = confirm(
      'Você está reportando que a resposta desta questão está incorreta. O administrador será notificado. Deseja continuar?'
    );

    if (confirmed) {
      onReportQuestion(currentQuestion);
      setReportedQuestions(prev => new Set(prev).add(questionId));
      alert('✅ Reporte enviado! O administrador será notificado.');
    }
  };

  const handleNext = () => {
    // Use savedAnswerRef which is set synchronously in handleSelect
    const savedAnswer = savedAnswerRef.current;
    const isCorrect = savedAnswer !== null && savedAnswer === currentQuestion.correctIndex;

    if (isProgressive && !isCorrect) {
      // Fail-fast: End immediately on incorrect answer
      // IMPORTANTE: Garantir que a última resposta está incluída
      const answersWithCurrent = savedAnswer !== null
        ? { ...session.answers, [currentQuestion.id]: savedAnswer }
        : session.answers;
      const finishedSession = { ...session, answers: answersWithCurrent, endTime: Date.now(), isFinished: true };
      setSession(finishedSession);
      setIsResultView(true);
      savedAnswerRef.current = null;
      return;
    }

    if (isLastQuestion) {
      // IMPORTANTE: Garantir que a última resposta está incluída
      const answersWithCurrent = savedAnswer !== null
        ? { ...session.answers, [currentQuestion.id]: savedAnswer }
        : session.answers;

      console.log('🏁 handleNext - Última questão:', {
        questionId: currentQuestion.id,
        savedAnswer,
        correctIndex: currentQuestion.correctIndex,
        sessionAnswers: session.answers,
        answersWithCurrent,
        hasLastAnswer: answersWithCurrent[currentQuestion.id] !== undefined
      });

      // Salvar as respostas finais no estado para usar no renderResults
      setFinalAnswers(answersWithCurrent);

      if (isProgressive && !isLastLevel) {
        // Capture the current state with the most recent answer
        sessionForNextLevel.current = {
          ...session,
          answers: answersWithCurrent,
          endTime: Date.now()
        };
        setShowPhaseComplete(true);
      } else {
        // Instead of finishing immediately, show Results View
        const finishedSession = { ...session, answers: answersWithCurrent, endTime: Date.now(), isFinished: true };
        setSession(finishedSession);
        setIsResultView(true);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowAnswer(false);
      savedAnswerRef.current = null;
    }
  };

  const handleExitResults = () => {
    onFinish(session);
  };

  // Determine styles for options based on state
  const getOptionStyle = (idx: number) => {
    const base = "w-full p-4 rounded-xl text-left text-sm transition-all duration-200 border-2 ";

    if (showAnswer) {
      if (idx === currentQuestion.correctIndex) return base + "border-brand-green bg-brand-green/10 text-brand-dark font-medium";
      if (idx === selectedOption) return base + "border-red-400 bg-red-50 text-brand-dark";
      return base + "border-transparent bg-brand-light opacity-50";
    }

    if (selectedOption === idx) return base + "border-brand-purple bg-white shadow-md text-brand-purple font-medium";
    return base + "border-transparent bg-brand-light text-brand-dark hover:bg-white hover:shadow-sm";
  };

  // ------------------------------------------
  // RESULTS VIEW RENDERER
  // ------------------------------------------
  const renderResults = () => {
    const allQuestions = [
      ...(session.accumulatedQuestions || []),
      ...session.questions
    ];

    // Use finalAnswers if available (set when finishing), otherwise use session.answers
    const allAnswers = finalAnswers || {
      ...(session.accumulatedAnswers || {}),
      ...session.answers
    };

    console.log('📊 renderResults - Calculando resultados:', {
      totalQuestions: allQuestions.length,
      allAnswers,
      usingFinalAnswers: !!finalAnswers
    });

    const totalQuestions = allQuestions.length;
    const correctCount = allQuestions.reduce((acc, q) => {
      const answer = allAnswers[q.id];
      return acc + (answer !== undefined && answer === q.correctIndex ? 1 : 0);
    }, 0);
    const wrongCount = allQuestions.reduce((acc, q) => {
      const answer = allAnswers[q.id];
      return acc + (answer !== undefined && answer !== q.correctIndex ? 1 : 0);
    }, 0);
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    const isProgressiveFailure = isProgressive && (wrongCount > 0);

    // Simplified view for Random mode
    if (session.mode === 'random') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-light animate-fade-in text-center">
          <div className="bg-white p-8 rounded-3xl shadow-neu w-full max-w-sm">
            <div className="w-20 h-20 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-purple">
              <Award size={40} />
            </div>
            <h2 className="text-2xl font-bold text-brand-dark mb-1">Treino Concluído!</h2>
            <p className="text-brand-muted mb-6">Modo Aleatório</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                <p className="text-xs text-green-700 font-medium">Acertos</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-2xl font-bold text-red-500">{wrongCount}</p>
                <p className="text-xs text-red-600 font-medium">Erros</p>
              </div>
            </div>

            <p className="text-sm text-brand-muted mb-6">
              Continue treinando para melhorar suas estatísticas globais!
            </p>

            <Button className="w-full py-3" onClick={handleExitResults}>
              <Home size={18} className="mr-2" /> Voltar ao Início
            </Button>
          </div>
        </div>
      );
    }

    // Detailed View for Challenge/Exam
    return (
      <div className="min-h-screen flex flex-col bg-[#F0F0F7] animate-fade-in">
        <header className="bg-brand-purple text-white p-6 rounded-b-[40px] shadow-lg relative z-10">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-1 opacity-90 uppercase tracking-wider text-xs">Resultado Final</h2>
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 break-words">{session.mode === 'exam' ? 'Prova Oficial' : 'Desafio Temático'}</h1>
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold">
              <Clock size={12} className="mr-1" /> {formatTime(elapsedTime)}
            </div>
          </div>
        </header>

        <div className="px-4 -mt-8 relative z-20 pb-24">
          {/* Main Score Card */}
          <div className="bg-white rounded-3xl shadow-neu p-6 mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-brand-muted">Aproveitamento</span>
              <span className={`text-3xl font-black ${percentage >= 70 && !isProgressiveFailure ? 'text-brand-green' : 'text-brand-purple'}`}>
                {isProgressiveFailure ? 'FALHA' : `${percentage}%`}
              </span>
            </div>

            {/* Power Bar */}
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-6 shadow-inner relative">
              <div
                className={`h-full transition-all duration-1000 ease-out rounded-full relative overflow-hidden ${isProgressiveFailure ? 'bg-red-500' : percentage >= 70 ? 'bg-brand-green' : percentage >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                style={{ width: `${isProgressiveFailure ? 100 : percentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>

            {!isProgressive && (
              <div className="flex justify-around border-t border-gray-100 pt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-600 rounded-full mb-1 mx-auto">
                    <CheckCircle size={20} />
                  </div>
                  <p className="text-xl font-bold text-brand-dark">{correctCount}</p>
                  <p className="text-[10px] text-brand-muted uppercase font-bold">Acertos</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-red-100 text-red-500 rounded-full mb-1 mx-auto">
                    <XCircle size={20} />
                  </div>
                  <p className="text-xl font-bold text-brand-dark">{wrongCount}</p>
                  <p className="text-[10px] text-brand-muted uppercase font-bold">Erros</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-500 rounded-full mb-1 mx-auto">
                    <Award size={20} />
                  </div>
                  <p className="text-xl font-bold text-brand-dark">
                    {session.mode === 'exam' ? Math.round((correctCount / totalQuestions) * 20) : '-'}
                  </p>
                  <p className="text-[10px] text-brand-muted uppercase font-bold">Pontos</p>
                </div>
              </div>
            )}
          </div>

          {/* Performance Breakdown */}
          {isProgressive && progressiveLevels ? (
            <>
              <h3 className="font-bold text-brand-dark mb-3 px-2">Desempenho por Fase</h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {progressiveLevels.map((level, idx) => {
                  const isCurrentLevel = level.level === currentLevel;
                  const isCompleted = progressiveLevels.findIndex(l => l.level === currentLevel) > idx;
                  const isFailed = isCurrentLevel && isProgressiveFailure;

                  let status: 'completed' | 'failed' | 'not-reached' = 'not-reached';
                  if (isCompleted) status = 'completed';
                  else if (isFailed) status = 'failed';
                  else if (isCurrentLevel && !isProgressiveFailure) status = 'completed';

                  const bgColor = status === 'completed' ? 'bg-green-500 border-green-600' :
                    status === 'failed' ? 'bg-red-500 border-red-600' :
                      'bg-gray-200 border-gray-300';
                  const textColor = status === 'not-reached' ? 'text-gray-500' : 'text-white';
                  const icon = status === 'completed' ? <CheckCircle size={20} /> :
                    status === 'failed' ? <XCircle size={20} /> : null;

                  return (
                    <div
                      key={level.level}
                      className={`p-4 rounded-2xl border-2 ${bgColor} ${textColor} flex items-center gap-3 shadow-sm transition-all`}
                    >
                      {icon && <div className="flex-shrink-0">{icon}</div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black uppercase truncate">{level.level}</p>
                        <p className="text-xs opacity-80">{level.questions.length} questões</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <h3 className="font-bold text-brand-dark mb-3 px-2">Desempenho por Questão</h3>
              <div className="grid grid-cols-5 gap-2 mb-6">
                {allQuestions.map((q, idx) => {
                  const answer = allAnswers[q.id];
                  const isAnswered = answer !== undefined;
                  const isCorrect = isAnswered && answer === q.correctIndex;

                  let bgColor = 'bg-gray-200 text-gray-400'; // Not reached
                  if (isAnswered) {
                    bgColor = isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white';
                  }

                  return (
                    <div
                      key={q.id}
                      className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${bgColor}`}
                    >
                      {idx + 1}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {isProgressive && (
            <div className={`mt-6 p-6 rounded-3xl border-2 text-center animate-bounce-in mb-6 ${!isProgressiveFailure ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {!isProgressiveFailure ? (
                <>
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-glow-green">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-green-600 uppercase">Desafio Concluído com Sucesso!</h3>
                  <p className="text-sm text-green-700 font-bold mt-1">Você dominou todos os níveis.</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-glow-red">
                    <XCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-red-600 uppercase text-balance">Insucesso na fase {currentLevel}</h3>
                  <p className="text-sm text-red-700 font-bold mt-1">Você precisa acertar todas para avançar.</p>
                </>
              )}
            </div>
          )}

          {session.mode === 'challenge' && !isProgressive && (
            <div className={`mt-6 p-6 rounded-3xl border-2 text-center animate-bounce-in mb-6 ${percentage >= 50 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
              {percentage >= 50 ? (
                <>
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-glow-green">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-green-600 uppercase">🎉 Parabéns!</h3>
                  <p className="text-sm text-green-700 font-bold mt-1">Próximo desafio desbloqueado!</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-glow-orange">
                    <XCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-orange-600 uppercase">📚 Continue Praticando!</h3>
                  <p className="text-sm text-orange-700 font-bold mt-1">
                    Você precisa de pelo menos 50% de acertos para desbloquear o próximo desafio.
                  </p>
                </>
              )}
            </div>
          )}

          <Button
            className={`w-full py-4 shadow-xl ${isProgressive && !isProgressiveFailure ? 'bg-brand-green border-none' : ''}`}
            onClick={handleExitResults}
          >
            {isProgressive ? (isProgressiveFailure ? 'Tentar Novamente' : 'Concluir e Voltar') : 'Concluir e Voltar'}
          </Button>
        </div>
      </div>
    );
  };

  // If in result mode, render result view
  if (isResultView) {
    return renderResults();
  }

  // If reading challenge and hasn't finished reading yet, render reading content view
  if (session.challengeSubType === 'reading' && session.readingContent && !hasFinishedReading) {
    return (
      <div className="pb-32 min-h-screen flex flex-col bg-[#F0F0F7]">
        {/* Header */}
        <header className="flex justify-between items-center py-4 sticky top-0 bg-[#F0F0F7] z-10 px-4 shadow-sm">
          <Button variant="ghost" onClick={onAbort} className="text-sm px-2">
            <ArrowLeft size={16} className="mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full font-mono font-medium bg-cyan-100 text-cyan-600">
              <BookOpen size={14} />
              Ler Conteúdo
            </div>
          </div>
        </header>

        {/* Reading Content */}
        <main className="flex-1 px-4 py-6 space-y-6">
          <div className="bg-white rounded-3xl shadow-neu p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center">
                <BookOpen size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-dark">Material de Estudo</h2>
                <p className="text-xs text-brand-muted">Leia com atenção o conteúdo abaixo</p>
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-brand-dark leading-relaxed">
              {session.readingContent && session.readingContent.trim() !== '' ? (
                <LatexRenderer content={session.readingContent} />
              ) : (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 text-center">
                  <p className="text-yellow-800 font-medium">⚠️ Nenhum conteúdo foi adicionado a este desafio.</p>
                  <p className="text-xs text-yellow-600 mt-2">O administrador precisa adicionar o material de leitura.</p>
                  <div className="mt-4 text-xs text-left bg-yellow-100 p-3 rounded">
                    <strong>Debug Info:</strong>
                    <pre className="mt-1 text-[10px]">{JSON.stringify({
                      hasContent: !!session.readingContent,
                      contentLength: session.readingContent?.length || 0,
                      challengeSubType: session.challengeSubType
                    }, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {session.questions.length > 0 && (
            <div className="bg-cyan-50 border-2 border-cyan-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-cyan-900 text-sm">Próxima Etapa</h3>
                  <p className="text-xs text-cyan-700 mt-1">
                    Após terminar a leitura, você responderá <strong>{session.questions.length} questões</strong> sobre este conteúdo.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Sticky Action Button */}
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#F0F0F7] via-[#F0F0F7] to-transparent md:max-w-md md:mx-auto">
          <Button
            className="w-full py-3.5 shadow-xl bg-cyan-500 border-none hover:bg-cyan-600"
            onClick={() => {
              if (session.questions.length > 0) {
                setHasFinishedReading(true);
              } else {
                const finishedSession = { ...session, endTime: Date.now(), isFinished: true };
                onFinish(finishedSession);
              }
            }}
          >
            {session.questions.length > 0 ? (
              <>
                <CheckCircle size={18} className="mr-2" />
                Concluir Leitura e Responder Questões
              </>
            ) : (
              <>
                <CheckCircle size={18} className="mr-2" />
                Concluir Desafio
              </>
            )}
          </Button>
        </footer>
      </div>
    );
  }

  // ------------------------------------------
  // STANDARD SIMULATION RENDERER
  // ------------------------------------------

  // Safety check: if no current question, show error or redirect
  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F0F7] p-4">
        <div className="bg-white rounded-3xl shadow-neu p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-brand-dark mb-2">Sem Questões</h2>
          <p className="text-sm text-brand-muted mb-6">Este desafio não possui questões configuradas.</p>
          <Button onClick={onAbort} className="w-full">Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center py-4 sticky top-0 bg-[#F0F0F7] z-10 px-4 shadow-sm md:shadow-none">
        <Button variant="ghost" onClick={onAbort} className="text-sm px-2">
          <ArrowLeft size={16} className="mr-1" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-mono font-medium ${remainingTime !== null && remainingTime < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-brand-light text-brand-purple shadow-neu-inset'}`}>
            <Clock size={14} />
            {remainingTime !== null ? formatTime(remainingTime) : formatTime(elapsedTime)}
          </div>
          {isProgressive && currentLevel && (
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getLevelColor(currentLevel)} shadow-sm animate-pulse`}>
              {currentLevel}
            </div>
          )}
          <button
            onClick={handleReportQuestion}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${reportedQuestions.has(currentQuestion.id)
              ? 'bg-brand-green text-white cursor-not-allowed'
              : 'bg-orange-100 text-orange-600 hover:bg-orange-200 active:scale-95'
              }`}
            title={reportedQuestions.has(currentQuestion.id) ? 'Questão já reportada' : 'Reportar resposta incorreta'}
            disabled={reportedQuestions.has(currentQuestion.id)}
          >
            {reportedQuestions.has(currentQuestion.id) ? (
              <CheckCircle size={16} />
            ) : (
              <HelpCircle size={16} />
            )}
          </button>
        </div>
        <div className="text-sm font-semibold text-brand-muted">
          {(session.accumulatedQuestions?.length || 0) + currentIndex + 1} / {(session.accumulatedQuestions?.length || 0) + session.questions.length}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1.5 bg-gray-200 w-full mb-6 overflow-hidden">
        <div
          className="h-full bg-brand-purple transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / session.questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <main className="flex-1 space-y-6 px-4">
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs font-bold text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded">{currentQuestion.discipline}</span>
            {currentQuestion.tags && currentQuestion.tags.map(t => (
              <span key={t} className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded uppercase tracking-wide">
                {t}
              </span>
            ))}
          </div>
          <div className="text-lg text-brand-dark font-medium leading-relaxed mt-2">
            <LatexRenderer content={currentQuestion.text} />
          </div>
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={getOptionStyle(idx)}
              disabled={showAnswer}
            >
              <div className="flex gap-3">
                <span className="font-bold min-w-[1.5rem]">{String.fromCharCode(65 + idx)}.</span>
                <div className="flex-1">
                  <LatexRenderer content={opt} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Explanation Section */}
        {showAnswer && (
          <div className="animate-fade-in space-y-4 pb-8">
            <div className={`p-4 rounded-xl ${selectedOption === currentQuestion.correctIndex ? 'bg-brand-green/20' : 'bg-red-100'}`}>
              <div className="flex items-center gap-2 font-bold mb-2">
                {selectedOption === currentQuestion.correctIndex ? (
                  <><CheckCircle size={20} className="text-brand-green" /> <span className="text-brand-green">Correto!</span></>
                ) : (
                  <><XCircle size={20} className="text-red-500" /> <span className="text-red-500">Incorreto</span></>
                )}
              </div>
              <div className="text-sm text-brand-dark leading-relaxed">
                <LatexRenderer content={currentQuestion.explanation} />
              </div>
            </div>

            {/* AI Explanation Button REMOVED */}
          </div>
        )}
      </main>

      {/* Sticky Action Button */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#F0F0F7] via-[#F0F0F7] to-transparent md:max-w-md md:mx-auto">
        {showAnswer && (
          <Button
            className="w-full py-3.5 shadow-xl"
            onClick={handleNext}
          >
            {isLastQuestion ? 'Ver Resultados' : 'Próxima Questão'}
          </Button>
        )}
      </footer>

      {/* Phase Complete Overlay */}
      {showPhaseComplete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center animate-bounce-in max-w-[280px] border-4 border-brand-green">
            <div className="w-20 h-20 bg-brand-green rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-glow-green">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Fase Concluída!</h3>
            <p className="text-brand-muted font-bold mt-2">Prepare-se para o próximo nível...</p>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
