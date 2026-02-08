
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../Button';
import { MOTIVATIONAL_PHRASES, getUserLevel, getLevelProgress } from '../../constants';
import { Zap, BookOpen, TrendingUp, Bell, Trophy, Award, Target, Flame, ArrowRight, Check, X, AlertTriangle, MessageSquare, Sparkles, Library, ChevronDown, Lock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { UserStats, RankingUser, Notification, UserAccount, AppTip, StudyGuide, OfficialExam } from '../../types';
import { LatexRenderer } from '../LatexRenderer';

interface DashboardProps {
  onNavigate: (view: string) => void;
  userStats: UserStats;
  rankingList: RankingUser[];
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  user: UserAccount;
  appTips: AppTip[];
  studyGuides: StudyGuide[];
  onStartRandomSimulado: () => void;
  exams: OfficialExam[];
  onStartExam: (exam: OfficialExam) => void;
  isAdminVipMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate, userStats, rankingList, notifications, onMarkNotificationRead, onMarkAllNotificationsRead, user, appTips, studyGuides, onStartRandomSimulado, exams, onStartExam, isAdminVipMode
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedGuides, setExpandedGuides] = useState<string[]>([]);
  const [greetingSubtitle, setGreetingSubtitle] = useState('');
  const [showVipModal, setShowVipModal] = useState(false);

  const handleExamClick = (exam: OfficialExam) => {
    // Admin VIP mode or user is VIP allows access
    const hasVipAccess = user?.isVip || isAdminVipMode || user?.role === 'admin';
    if (exam.isVip && !hasVipAccess) {
      setShowVipModal(true);
      return;
    }
    onStartExam(exam);
  };

  const toggleGuide = (id: string) => {
    setExpandedGuides(prev =>
      prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
    );
  };

  // Lógica para selecionar a frase motivacional aleatória ao montar o componente
  useEffect(() => {
    // Fallback if gender is missing from UserAccount
    const userGender = (user as any).gender || 'male';
    const phrases = userGender === 'female'
      ? MOTIVATIONAL_PHRASES.female
      : MOTIVATIONAL_PHRASES.male;

    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    setGreetingSubtitle(randomPhrase);
  }, [user]);

  const data = [
    { name: 'Acertos', value: userStats.accuracy },
    { name: 'Erros', value: 100 - userStats.accuracy },
  ];
  const COLORS = ['#FFFFFF', 'rgba(255, 255, 255, 0.2)'];

  const unreadCount = notifications.filter(n => !n.read).length;

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return "text-yellow-400";
      case 1: return "text-gray-400";
      case 2: return "text-amber-700";
      default: return "text-brand-purple";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <Trophy size={18} className="text-brand-green" />;
      case 'warning': return <AlertTriangle size={18} className="text-yellow-500" />;
      case 'info': default: return <MessageSquare size={18} className="text-blue-500" />;
    }
  };

  return (
    <div className="flex flex-col space-y-6 relative">

      {/* Hero Section Imersiva */}
      <div className="relative -mx-4 -mt-4 pt-10 pb-8 px-6 bg-gradient-to-br from-brand-green to-teal-600 rounded-b-[40px] shadow-glow overflow-hidden mb-2">
        <div className="absolute inset-0 bg-pattern opacity-30"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-300 opacity-20 rounded-full blur-2xl"></div>

        <header className="relative flex justify-between items-center mb-6">
          <div className="animate-fade-in-up flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight break-words">Olá, {user?.name || 'Visitante'}👋</h1>
              {user?.isVip && (
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 rounded-full shadow-lg animate-fade-in">
                  <Trophy size={14} className="text-white" fill="white" />
                  <span className="text-xs font-black text-white uppercase tracking-wide">VIP</span>
                </div>
              )}
            </div>
            <p className="text-emerald-100 font-medium text-sm">{greetingSubtitle}</p>
          </div>
          <Button
            variant="icon"
            onClick={() => setShowNotifications(true)}
            className="relative bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border border-white/10 animate-fade-in-up delay-100"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-emerald-600 animate-pulse"></span>
            )}
          </Button>
        </header>

        <div className="relative flex items-center justify-between animate-fade-in-up delay-200">
          <div className="flex flex-col space-y-3 flex-1">
            <div className="flex items-center gap-2 flex-wrap">

              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full w-fit">
                <Trophy size={14} className="text-brand-purple fill-brand-purple" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">#{(userStats?.rank || '-')} no Ranking</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full w-fit">
                <span className="text-sm">{getUserLevel(user?.examPoints || 0).icon}</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">{getUserLevel(user?.examPoints || 0).name}</span>
              </div>
            </div>

          </div>

          {/* Gráfico Circular de Precisão Reduzido com Porcentagem no Meio */}
          <div className="h-20 w-20 relative flex-shrink-0 ml-4">
            <div className="absolute inset-0 flex flex-col items-center justify-center -space-y-1">
              <span className="text-lg font-black text-white leading-none">{(userStats?.accuracy || 0)}%</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={30}
                  outerRadius={38}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Análise de Desempenho - Sempre Visível */}
      <section className="animate-fade-in-up delay-250 -mt-2">
        <div className="space-y-3 px-1">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl p-5">
            <h4 className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400 text-xs uppercase mb-4">
              <AlertTriangle size={16} /> Focar nos Estudos (Prioridade)
            </h4>
            <div className="space-y-2">
              {(() => {
                const weaknesses: { disc: string, topic: string, pct: number }[] = [];
                Object.entries(userStats.detailedStats || {}).forEach(([disc, topics]) => {
                  Object.entries(topics).forEach(([topic, stats]) => {
                    const pct = Math.round((stats.correct / stats.total) * 100);
                    if (pct < 60) {
                      weaknesses.push({ disc, topic, pct });
                    }
                  });
                });

                return weaknesses.length > 0 ? weaknesses.slice(0, 3).map((w, i) => (
                  <div key={i} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm">
                    <div>
                      <span className="text-xs font-bold text-brand-dark dark:text-white block">{w.disc}</span>
                      <span className="text-[10px] text-brand-muted dark:text-gray-400">{w.topic}</span>
                    </div>
                    <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">{w.pct}%</span>
                  </div>
                )) : (
                  <p className="text-xs text-gray-500 italic">Nenhum ponto crítico detectado. Continue assim!</p>
                );
              })()}
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-2xl p-5">
            <h4 className="flex items-center gap-2 font-bold text-green-700 dark:text-green-400 text-xs uppercase mb-4">
              <Check size={16} /> Pontos Fortes (Dominados)
            </h4>
            <div className="space-y-2">
              {(() => {
                const strengths: { disc: string, topic: string, pct: number }[] = [];
                Object.entries(userStats.detailedStats || {}).forEach(([disc, topics]) => {
                  Object.entries(topics).forEach(([topic, stats]) => {
                    const pct = Math.round((stats.correct / stats.total) * 100);
                    if (pct > 80) {
                      strengths.push({ disc, topic, pct });
                    }
                  });
                });

                return strengths.length > 0 ? strengths.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm">
                    <div>
                      <span className="text-xs font-bold text-brand-dark dark:text-white block">{s.disc}</span>
                      <span className="text-[10px] text-brand-muted dark:text-gray-400">{s.topic}</span>
                    </div>
                    <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded">{s.pct}%</span>
                  </div>
                )) : (
                  <p className="text-xs text-gray-500 italic">Treine mais para descobrir seus pontos fortes!</p>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Dicas e Mensagens (Horizontal Scroll with Colors) */}
      <section className="animate-fade-in-up delay-250 overflow-hidden -mx-4 py-2">
        <div className="flex overflow-x-auto gap-4 pb-2 px-6 no-scrollbar snap-x">
          {appTips.map((tip, index) => {
            const colors = [
              { bg: 'from-purple-500 to-indigo-600', text: 'text-white', icon: 'bg-white/20 text-white', border: 'border-purple-400/30' },
              { bg: 'from-emerald-500 to-teal-600', text: 'text-white', icon: 'bg-white/20 text-white', border: 'border-emerald-400/30' },
              { bg: 'from-orange-500 to-rose-600', text: 'text-white', icon: 'bg-white/20 text-white', border: 'border-orange-400/30' },
              { bg: 'from-cyan-500 to-blue-600', text: 'text-white', icon: 'bg-white/20 text-white', border: 'border-cyan-400/30' },
              { bg: 'from-pink-500 to-fuchsia-600', text: 'text-white', icon: 'bg-white/20 text-white', border: 'border-pink-400/30' },
            ];
            const colorScheme = colors[index % colors.length];

            return (
              <div
                key={tip.id}
                className={`min-w-[280px] max-w-[280px] bg-gradient-to-br ${colorScheme.bg} p-4 rounded-2xl shadow-lg border ${colorScheme.border} flex flex-col gap-2 flex-shrink-0 snap-center`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`${colorScheme.icon} p-1.5 rounded-lg`}>
                    <Sparkles size={14} />
                  </div>
                  <span className={`text-[10px] font-black ${colorScheme.text} uppercase tracking-widest opacity-90`}>Dica Premium</span>
                </div>
                <p className={`text-xs ${colorScheme.text} font-medium leading-relaxed italic opacity-95`}>
                  "{tip.content}"
                </p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/20">
                  <span className={`text-[9px] font-bold ${colorScheme.text} uppercase opacity-80`}>{tip.author}</span>
                  <span className={`text-[9px] ${colorScheme.text} opacity-70`}>{tip.timestamp}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Provas Oficiais (Exames) */}
      {exams && exams.some(e => e.active) && (
        <section className="animate-fade-in-up delay-250 px-2 -mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-brand-dark dark:text-white flex items-center gap-2">
              <Trophy className="text-yellow-500" size={24} />
              Provas Oficiais
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {exams.filter(e => e.active).map(exam => (
              <button
                key={exam.id}
                onClick={() => handleExamClick(exam)}
                className={`bg-slate-900 border rounded-2xl p-5 flex items-center gap-4 group transition-all shadow-lg relative overflow-hidden ${exam.isVip && !user.isVip ? 'border-amber-500/30 opacity-80' : 'border-yellow-500/30 hover:border-yellow-500'}`}
              >
                <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors"></div>
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-black shadow-glow-yellow group-hover:scale-110 transition-transform">
                  <Trophy size={24} />
                </div>
                <div className="flex-1 text-left relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    {exam.isVip && !user.isVip && <Lock size={16} className="text-amber-500" />}
                    <h3 className="font-black text-white text-lg">{exam.title}</h3>
                    {exam.isVip && (
                      <span className="text-[9px] font-black bg-amber-500 text-black px-2 py-0.5 rounded uppercase">VIP</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase">{exam.timeLimit} Minutos • Oficial</p>
                </div>
                <div className="bg-white/10 p-2 rounded-full text-white group-hover:bg-yellow-500 group-hover:text-black transition-all">
                  <ArrowRight size={20} />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-4 px-2 -mt-4 relative z-10 animate-fade-in-up delay-300">
        <button
          onClick={() => onNavigate('simulado-config')}
          className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-neu flex flex-col items-start gap-3 transition-transform hover:-translate-y-1 active:scale-95 group overflow-hidden relative"
        >
          <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform dark:opacity-10">
            <Zap size={80} className="dark:text-brand-purple" />
          </div>
          <div className="p-3 bg-brand-purple/10 rounded-xl text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-colors">
            <Zap size={24} fill="currentColor" className="opacity-80" />
          </div>
          <div>
            <h3 className="font-bold text-brand-dark dark:text-white text-lg leading-tight">Novo<br />Simulado</h3>
            <span className="text-xs text-brand-muted dark:text-gray-400 font-medium mt-1 block">Configurar treino</span>
          </div>
        </button>

        <button
          onClick={onStartRandomSimulado}
          className="bg-brand-green dark:bg-green-800 p-4 rounded-2xl shadow-neu flex flex-col items-start gap-3 transition-transform hover:-translate-y-1 active:scale-95 group overflow-hidden relative"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-110 transition-transform">
            <BookOpen size={80} className="text-white" />
          </div>
          <div className="p-3 bg-white/20 rounded-xl text-white group-hover:bg-white group-hover:text-brand-green transition-colors">
            <BookOpen size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">Questões<br />Rápidas</h3>
            <span className="text-xs text-green-100 font-medium mt-1 block">Modo aleatório</span>
          </div>
        </button>
      </section>

      {/* Guia de Estudo por Disciplina */}
      <section className="animate-fade-in-up delay-350 px-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-brand-dark dark:text-white flex items-center gap-2">
            <BookOpen className="text-brand-purple" size={24} />
            Guia de Estudo
          </h2>
        </div>
        <div className="space-y-4">
          {Array.isArray(studyGuides) && studyGuides.length > 0 ? (
            studyGuides.map((guide) => {
              if (!guide || typeof guide !== 'object') return null;
              const guideId = guide.id || Math.random().toString();
              const isExpanded = Array.isArray(expandedGuides) && expandedGuides.includes(guideId);

              return (
                <div key={guideId} className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-neu border border-transparent hover:border-brand-purple/20 transition-all overflow-hidden">
                  <button
                    onClick={() => toggleGuide(guideId)}
                    className="w-full p-5 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-purple text-white p-2 rounded-xl shadow-glow-purple group-hover:scale-110 transition-transform">
                        <Library size={18} />
                      </div>
                      <h3 className="font-black text-brand-dark dark:text-white uppercase tracking-tight text-sm">
                        {typeof guide.discipline === 'string' ? guide.discipline : 'Disciplina'}
                      </h3>
                    </div>
                    <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-brand-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown size={16} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-6 animate-fade-in-up">
                      <div className="relative pl-4 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-brand-purple before:to-transparent">
                        {Array.isArray(guide.topics) && guide.topics.length > 0 ? (
                          guide.topics.map((topic, idx) => {
                            if (!topic || typeof topic !== 'object') return null;
                            return (
                              <div key={topic.id || idx} className="relative">
                                <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-brand-purple border-2 border-white dark:border-gray-800 shadow-sm"></div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-brand-purple uppercase mb-0.5">Tema {idx + 1}</span>
                                  <h4 className="text-sm font-bold text-brand-dark dark:text-white">
                                    {typeof topic.title === 'string' ? topic.title : 'Sem título'}
                                  </h4>
                                  {typeof topic.description === 'string' && (
                                    <p className="text-[11px] text-brand-muted dark:text-gray-400 mt-1">{topic.description}</p>
                                  )}
                                  {Array.isArray(topic.subthemes) && topic.subthemes.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {topic.subthemes.map((sub, sIdx) => {
                                        if (typeof sub !== 'string' && typeof sub !== 'number') return null;
                                        return (
                                          <span key={sIdx} className="text-[9px] font-bold bg-gray-100 dark:bg-gray-700 text-brand-muted dark:text-gray-300 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600">
                                            {sub.toString()}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-500 italic py-2">Nenhum tópico definido</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center bg-white dark:bg-gray-800 rounded-[2rem] shadow-neu border border-transparent">
              <Library size={40} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 text-sm italic">Nenhum guia de estudo disponível no momento.</p>
            </div>
          )}
        </div>
      </section>

      {/* Ranking Section */}
      <section className="animate-fade-in-up delay-300">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-xl font-bold text-brand-dark dark:text-white flex items-center gap-2">
            <Award className="text-brand-green" size={24} />
            Ranking Semanal
          </h2>
          <button
            onClick={() => onNavigate('ranking-detail')}
            className="text-xs font-bold text-brand-green hover:underline flex items-center gap-1"
          >
            Ver Todos <ArrowRight size={12} />
          </button>
        </div>

        <div className="flex overflow-x-auto gap-3 pb-6 -mx-4 px-6 no-scrollbar snap-x">
          {rankingList.map((userItem, index) => {
            const isMe = userItem.id === user.id;
            return (
              <div
                key={userItem.id}
                onClick={() => onNavigate('ranking-detail')}
                className={`min-w-[105px] glass-card border shadow-neu rounded-2xl p-2.5 flex flex-col items-center relative snap-start cursor-pointer
                  ${isMe ? 'bg-brand-purple/5 border-brand-purple dark:bg-brand-purple/20' : 'bg-white dark:bg-gray-800 border-white dark:border-gray-700'}`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-2 mt-2 shadow-inner border border-white dark:border-gray-600`}>
                  <span className={`text-3xl font-black ${getRankColor(index)} drop-shadow-sm`}>
                    #{index + 1}
                  </span>
                </div>
                <h3 className={`text-xs font-bold truncate w-full text-center mb-1 ${isMe ? 'text-brand-purple dark:text-brand-purple' : 'text-brand-dark dark:text-gray-200'}`}>
                  {userItem.name}
                </h3>
                <div className="bg-brand-green/10 text-brand-green-dark px-1.5 py-0.5 rounded-md text-[10px] font-extrabold mb-2">
                  {userItem.score} pts
                </div>
                <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-green rounded-full"
                    style={{ width: `${userItem.accuracy}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Panel de Notificações */}
      {showNotifications && (
        <div className="fixed inset-0 z-[60] flex items-start justify-end sm:items-start bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-[#F0F0F7] to-white dark:from-gray-900 dark:to-gray-800 w-full h-full sm:max-w-sm sm:h-[90vh] sm:mt-4 sm:mr-4 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-brand-green-dark" />
                <h2 className="text-lg font-bold text-brand-dark dark:text-white">Notificações</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button onClick={() => setShowNotifications(false)} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full text-brand-muted dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-brand-muted flex flex-col items-center">
                  <Bell size={32} className="opacity-30 mb-2" />
                  <p>Sem avisos por enquanto.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => onMarkNotificationRead(notif.id)}
                    className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer group hover:scale-[1.02]
                      ${notif.read
                        ? 'bg-white/60 dark:bg-gray-800/60 border-transparent'
                        : 'bg-white dark:bg-gray-800 border-l-4 border-l-brand-green border-y-transparent border-r-transparent shadow-neu'}`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${notif.read ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-brand-light dark:bg-gray-700 text-brand-dark dark:text-white'}`}>
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-bold ${notif.read ? 'text-brand-muted dark:text-gray-500' : 'text-brand-dark dark:text-white'}`}>
                          {notif.title}
                        </h4>
                        <div className={`text-xs mt-1 leading-relaxed ${notif.read ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300'}`}>
                          <LatexRenderer content={notif.message} previewMode={true} />
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium mt-2 flex items-center gap-1">
                          {notif.time} {notif.read && <Check size={10} className="text-brand-green" />}
                        </p>

                        {/* Botão Corrigir para admin em notificações de questões reportadas */}
                        {user.role === 'admin' && notif.type === 'question_report' && notif.questionData && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('admin-panel');
                            }}
                            className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                          >
                            <AlertTriangle size={14} />
                            Corrigir no Painel Admin
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {unreadCount > 0 && (
              <div className="p-4 bg-white/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 backdrop-blur-sm">
                <Button
                  variant="secondary"
                  className="w-full text-xs py-3 font-bold text-brand-green-dark bg-brand-green/10 hover:bg-brand-green/20 border-none shadow-none"
                  onClick={onMarkAllNotificationsRead}
                >
                  Marcar todas como lidas
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* VIP Upgrade Modal */}
      {showVipModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowVipModal(false)}>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-amber-500/20" onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Trophy size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">Prova Exclusiva VIP</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Esta prova é exclusiva para membros VIP. Faça upgrade da sua conta para ter acesso a todas as provas premium!
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
      )}

    </div>
  );
};
