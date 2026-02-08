
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../Button';
import {
  ShieldCheck, Send, Plus, Zap, Trash2, Folder,
  FileText, ArrowLeft, ChevronRight, Users, Database, Globe,
  Activity, Edit3, UserCheck, Search, CheckSquare, Square, History, X,
  Eye, Target, Trophy, ListChecks, Clock, Settings, Sparkles, Layers,
  Hash, Image as ImageIcon, AlertCircle, Save, CheckCircle2, Monitor, Smartphone,
  BrainCircuit, BookOpen, Upload, Copy, LogOut, TrendingUp, Flame, LogIn
} from 'lucide-react';
import { AdminSummary, Notification, TopicNode, SimuladoPreset, UserAccount, Question, Difficulty, QuestionType, AppTip, StudyGuide, ChallengeSubType, AdminMaterial, ProgressiveLevel, OfficialExam, ExamAccessRecord } from '../../types';
import { LatexRenderer } from '../LatexRenderer';
import { LATEX_PROMPT_GUIDE, getUserLevel, getNextLevel } from '../../constants';
import { supabase } from '../../services/supabase';

// JSON Structure Examples
const TRAINING_QUESTIONS_EXAMPLE = `[
  {
    "text": "Qual é a capital do Brasil?",
    "options": ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"],
    "correctIndex": 2,
    "explanation": "Brasília é a capital federal do Brasil desde 1960.",
    "discipline": "Geografia",
    "difficulty": "Fácil"
  }
]`;

const SIMULADO_QUESTIONS_EXAMPLE = `[
  {
    "text": "Pergunta aqui?",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Resposta correta é A porque..."
  }
]`;

const GUIDE_JSON_EXAMPLE = `[
  {
    "id": "t1",
    "title": "Tema 1: Nome do Tema",
    "description": "Descrição opcional do que estudar.",
    "subthemes": ["Subtema 1.1", "Subtema 1.2"]
  }
]`;

const PROGRESSIVE_LEVELS: ProgressiveLevel[] = ['Fácil', 'Moderado', 'Médio', 'Médio Moderado', 'Difícil', 'Super Difícil'];

type AdminState = {
  activeTab: string;
  isCreatingSimulado: boolean;
  simuladoStep: number;
  editingQuestion: Partial<Question> | null;
  isImportingQuestions: boolean;
  isImportingToSimulado: boolean;
  showFullJsonImport: boolean;
  editingGuideId: string | null;
};

interface AdminPanelProps {
  onBack: () => void;
  summaries: AdminSummary[];
  topicTree: TopicNode;
  notifications: Notification[];
  users: UserAccount[];
  presets: SimuladoPreset[];
  onAddSummary: (s: AdminSummary) => void;
  onUpdateSummary: (s: AdminSummary) => void;
  onDeleteSummary: (id: string) => void;
  onSendNotification: (n: Notification) => void;
  onUpdateNotification: (n: Notification) => void;
  onDeleteNotification: (id: string) => void;
  onAddTopic: (parentId: string, t: TopicNode) => void;
  onDeleteTopic: (id: string) => void;
  onAddPreset: (p: SimuladoPreset) => void;
  onDeletePreset: (id: string) => void;
  onConfirmUser: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUserPoints: (userId: string, points: number) => void;
  onToggleUserVip: (userId: string) => void;
  appTips: AppTip[];
  onAddTip: (tip: AppTip) => void;
  onDeleteTip: (id: string) => void;
  studyGuides: StudyGuide[];
  onAddStudyGuide: (sg: StudyGuide) => void;
  onUpdateStudyGuide: (sg: StudyGuide) => void;
  onDeleteStudyGuide: (id: string) => void;
  isDesktopMode: boolean;
  onToggleDesktopMode: (val: boolean) => void;
  trainingQuestions: Question[];
  onAddTrainingQuestion: (q: Question) => void;
  onImportTrainingQuestions: (questions: Question[]) => void;
  onDeleteTrainingQuestion: (id: string) => void;
  materials: AdminMaterial[];
  onAddMaterial: (m: AdminMaterial) => void;
  onUpdateMaterial: (m: AdminMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  onUpdateTopic: (id: string, updatedNode: Partial<TopicNode>) => void;
  onUpdatePreset: (p: SimuladoPreset) => void;
  onToggleUserVip: (userId: string) => void;
  exams: OfficialExam[];
  examAccessRecords: ExamAccessRecord[];
  onAddExam: (e: OfficialExam) => void;
  onUpdateExam: (e: OfficialExam) => void;
  onDeleteExam: (id: string) => void;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

const AdminUsersTab: React.FC<{
  users: UserAccount[];
  getUserLevel: (points: number) => any;
  getNextLevel: (points: number) => any;
  onUpdateUserPoints: (userId: string, points: number) => void;
  onToggleUserVip: (userId: string) => void;
}> = ({ users, getUserLevel, getNextLevel, onUpdateUserPoints, onToggleUserVip }) => {
  const [pointsInputs, setPointsInputs] = useState<Record<string, string>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [showPasswordModals, setShowPasswordModals] = useState<Record<string, boolean>>({});
  const [pendingPointsMap, setPendingPointsMap] = useState<Record<string, number>>({});

  const handleSubmitPoints = (userId: string, userName: string) => {
    const password = passwordInputs[userId] || '';
    const points = pendingPointsMap[userId] || 0;

    if (!password.trim()) {
      alert('❌ Digite a senha do administrador!');
      return;
    }

    const adminPassword = 'admin123';

    if (password.trim() !== adminPassword) {
      alert('❌ Senha incorreta!');
      setPasswordInputs(prev => ({ ...prev, [userId]: '' }));
      return;
    }

    if (onUpdateUserPoints) {
      onUpdateUserPoints(userId, points);
      alert(`✅ ${points > 0 ? 'Adicionados' : 'Removidos'} ${Math.abs(points)} pontos ${points > 0 ? 'para' : 'de'} ${userName}`);
    } else {
      alert('⚠️ Função onUpdateUserPoints não implementada.');
    }

    setShowPasswordModals(prev => ({ ...prev, [userId]: false }));
    setPasswordInputs(prev => ({ ...prev, [userId]: '' }));
    setPointsInputs(prev => ({ ...prev, [userId]: '' }));
    setPendingPointsMap(prev => ({ ...prev, [userId]: 0 }));
  };

  return (
    <div className="space-y-6 animate-page-enter">
      <section className="glass-card rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Users size={100} /></div>
        <h2 className="text-xl font-bold mb-2">👥 Gerenciar Pontos dos Alunos</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6">
          Adicione ou remova pontos para bônus ou penalidades. Requer senha do administrador para confirmar.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {users.filter(u => u.role === 'user').map(user => {
            const currentLevel = getUserLevel(user.examPoints || 0);
            const nextLevel = getNextLevel(user.examPoints || 0);

            return (
              <div key={user.id} className="bg-slate-900 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-16 h-16 rounded-full border-2 border-purple-500"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">{user.fullName}</h3>
                    <p className="text-xs text-slate-400">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-2xl">{currentLevel.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-purple-400">{currentLevel.name}</p>
                        <p className="text-xs text-slate-500">{user.examPoints || 0} pontos</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VIP Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${user.isVip ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                      <Trophy size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-500">Status VIP</p>
                      <p className="text-[10px] text-slate-400">{user.isVip ? 'Usuário possui acesso ilimitado' : 'Usuário padrão'}</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onToggleUserVip(user.id)}
                    className={`rounded-xl ${user.isVip ? 'bg-amber-500 hover:bg-amber-600 text-white border-none' : 'bg-slate-700 text-white'}`}
                  >
                    {user.isVip ? 'Remover VIP' : 'Tornar VIP'}
                  </Button>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={pointsInputs[user.id] || ''}
                      onChange={e => setPointsInputs(prev => ({ ...prev, [user.id]: e.target.value }))}
                      placeholder="Ex: +50 (bônus) ou -20 (penalidade)"
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => {
                        const points = parseInt(pointsInputs[user.id] || '0');
                        if (isNaN(points) || points === 0) {
                          alert('Digite um número válido!');
                          return;
                        }
                        setPendingPointsMap(prev => ({ ...prev, [user.id]: points }));
                        setShowPasswordModals(prev => ({ ...prev, [user.id]: true }));
                      }}
                      disabled={!pointsInputs[user.id]}
                      className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all"
                    >
                      Atualizar
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[50, 100, 200, 500, 1000, -50].map(quick => (
                      <button
                        key={quick}
                        onClick={() => {
                          setPendingPointsMap(prev => ({ ...prev, [user.id]: quick }));
                          setShowPasswordModals(prev => ({ ...prev, [user.id]: true }));
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${quick > 0
                          ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                          : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                          }`}
                      >
                        {quick > 0 ? '+' : ''}{quick}
                      </button>
                    ))}
                  </div>

                  {nextLevel && (
                    <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700">
                      <span className="font-bold">Próximo nível:</span> {nextLevel.name} {nextLevel.icon}
                      <span className="ml-2">({nextLevel.minPoints} pontos)</span>
                    </div>
                  )}
                </div>

                {showPasswordModals[user.id] && (
                  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl">
                      <h3 className="text-xl font-black text-white mb-2">🔒 Confirmação Necessária</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Você está prestes a {(pendingPointsMap[user.id] || 0) > 0 ? 'adicionar' : 'remover'} <strong className="text-purple-400">{Math.abs(pendingPointsMap[user.id] || 0)} pontos</strong> {(pendingPointsMap[user.id] || 0) > 0 ? 'para' : 'de'} <strong>{user.name}</strong>.
                      </p>

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-300 uppercase mb-2 block">
                            Senha do Administrador:
                          </label>
                          <input
                            type="password"
                            value={passwordInputs[user.id] || ''}
                            onChange={e => setPasswordInputs(prev => ({ ...prev, [user.id]: e.target.value }))}
                            placeholder="Digite a senha"
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-purple-500"
                            onKeyPress={e => e.key === 'Enter' && handleSubmitPoints(user.id, user.name)}
                            autoFocus
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowPasswordModals(prev => ({ ...prev, [user.id]: false }));
                              setPasswordInputs(prev => ({ ...prev, [user.id]: '' }));
                              setPendingPointsMap(prev => ({ ...prev, [user.id]: 0 }));
                            }}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-bold transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSubmitPoints(user.id, user.name)}
                            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg font-bold transition-all"
                          >
                            Confirmar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {users.filter(u => u.role === 'user').length === 0 && (
            <p className="text-slate-500 text-center py-8">Nenhum aluno cadastrado ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
};

const AdminExamsTab: React.FC<{
  exams: OfficialExam[];
  accessRecords: ExamAccessRecord[];
  users: UserAccount[];
  onAddExam: (e: OfficialExam) => void;
  onUpdateExam: (e: OfficialExam) => void;
  onDeleteExam: (id: string) => void;
}> = ({ exams, accessRecords, users, onAddExam, onUpdateExam, onDeleteExam }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingExam, setEditingExam] = useState<OfficialExam | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [isVip, setIsVip] = useState(true);
  const [showRecords, setShowRecords] = useState(false);

  const handleSave = () => {
    if (!title || !content) {
      alert('Título e conteúdo são obrigatórios!');
      return;
    }

    const examData: OfficialExam = {
      id: editingExam?.id || `exam_${Date.now()}`,
      title,
      content,
      timeLimit,
      isVip,
      active: editingExam ? editingExam.active : true,
      createdAt: editingExam?.createdAt || new Date().toISOString()
    };

    if (editingExam) {
      onUpdateExam(examData);
    } else {
      onAddExam(examData);
    }

    resetForm();
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingExam(null);
    setTitle('');
    setContent('');
    setTimeLimit(60);
    setIsVip(true);
  };

  const startEdit = (exam: OfficialExam) => {
    setEditingExam(exam);
    setTitle(exam.title);
    setContent(exam.content);
    setTimeLimit(exam.timeLimit);
    setIsVip(exam.isVip);
    setIsCreating(true);
  };

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="text-purple-500" /> Gerenciar Exames
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowRecords(!showRecords)}>
            {showRecords ? 'Ver Exames' : 'Ver Acessos'}
          </Button>
          {!showRecords && (
            <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
              <Plus size={18} /> Novo Exame
            </Button>
          )}
        </div>
      </div>

      {showRecords ? (
        <div className="space-y-4">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <History className="text-amber-500" /> Histórico de Acessos por Exame
          </h3>

          {exams.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 border border-white/10 text-center">
              <p className="text-slate-500">Nenhum exame criado ainda.</p>
            </div>
          ) : (
            exams.map(exam => {
              const examRecords = accessRecords.filter(r => r.examId === exam.id);
              const finishedCount = examRecords.filter(r => r.status === 'finished').length;
              const notFinishedCount = examRecords.filter(r => r.status === 'not_finished').length;
              const inProgressCount = examRecords.filter(r => r.status === 'started').length;

              return (
                <div key={exam.id} className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                  {/* Cabeçalho do Exame */}
                  <div className="p-5 bg-slate-900/50 border-b border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${exam.active ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'}`}>
                          <FileText size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{exam.title}</h4>
                          <p className="text-xs text-slate-400">{exam.timeLimit} min • {exam.isVip ? 'VIP' : 'Público'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-lg font-bold">{finishedCount} ✓</span>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg font-bold">{notFinishedCount} ✗</span>
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg font-bold">{inProgressCount} ⏳</span>
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-lg font-bold">{examRecords.length} total</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Alunos que Acessaram */}
                  {examRecords.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-slate-500 text-sm">Nenhum aluno acessou este exame ainda.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {examRecords.map(record => {
                        const userAccount = users.find(u => u.id === record.userId);
                        // Usar dados do registro primeiro, depois do userAccount como fallback
                        const avatarUrl = record.userAvatar || userAccount?.avatarUrl;
                        const email = record.userEmail || userAccount?.email;
                        const isVip = record.userIsVip ?? userAccount?.isVip;
                        const points = record.userPoints ?? userAccount?.examPoints ?? 0;

                        return (
                          <div key={record.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-3">
                              {avatarUrl && (
                                <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-purple-500/50" />
                              )}
                              <div>
                                <p className="font-medium text-white text-sm">{record.userName}</p>
                                {record.userAccountName && record.userAccountName !== record.userName && (
                                  <p className="text-xs text-slate-500 italic">Conta: {record.userAccountName}</p>
                                )}
                                <p className="text-xs text-slate-400">{record.userPhone}</p>
                                {email && (
                                  <p className="text-[10px] text-slate-500 mt-0.5">{email}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex gap-1">
                                {isVip && (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">VIP</span>
                                )}
                                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">
                                  {points} pts
                                </span>
                              </div>

                              <div className="text-right text-xs">
                                <p className="text-slate-400">Iniciou: {new Date(record.accessedAt).toLocaleString('pt-BR')}</p>
                                {record.finishedAt && (
                                  <p className="text-green-400">Finalizou: {new Date(record.finishedAt).toLocaleString('pt-BR')}</p>
                                )}
                              </div>

                              {record.status === 'finished' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                  Finalizado
                                </span>
                              ) : record.status === 'not_finished' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                                  Não Finalizada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold">
                                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                                  Em Progresso
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : isCreating ? (
        <div className="glass-card rounded-3xl p-8 border border-white/10 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">{editingExam ? 'Editar Exame' : 'Criar Novo Exame'}</h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-white"><X /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Título do Exame</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Ex: Exame de Matemática - 1º Trimestre"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Tempo (minutos)</label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={e => setTimeLimit(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="flex items-end pb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isVip}
                      onChange={e => setIsVip(e.target.checked)}
                      className="w-5 h-5 rounded border-white/10 bg-slate-900 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-slate-300">Apenas VIP</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-400 mb-1">Conteúdo (LaTeX)</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={10}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                placeholder="Digite as questões em formato LaTeX..."
              />
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
            <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Pré-visualização</h4>
            <div className="prose prose-invert max-w-none">
              <LatexRenderer content={content || '*Nenhum conteúdo digitado*'} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSave}>{editingExam ? 'Salvar Alterações' : 'Publicar Exame'}</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map(exam => (
            <div key={exam.id} className="glass-card rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${exam.active ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'}`}>
                  <FileText size={20} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(exam)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => onDeleteExam(exam.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-white mb-2 line-clamp-1">{exam.title}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-md flex items-center gap-1">
                  <Clock size={10} /> {exam.timeLimit} min
                </span>
                {exam.isVip && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded-md flex items-center gap-1">
                    <Trophy size={10} /> VIP
                  </span>
                )}
                <span className={`text-[10px] px-2 py-1 rounded-md ${exam.active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {exam.active ? 'Ativo' : 'Desativado'}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => onUpdateExam({ ...exam, active: !exam.active })}
                className="text-xs"
              >
                {exam.active ? 'Desativar Exame' : 'Ativar Exame'}
              </Button>
            </div>
          ))}
          {exams.length === 0 && (
            <div className="col-span-full py-12 text-center glass-card rounded-3xl border border-dashed border-white/10">
              <p className="text-slate-500">Nenhum exame criado ainda.</p>
              <Button variant="secondary" onClick={() => setIsCreating(true)} className="mt-4">
                Criar Primeiro Exame
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBack, summaries, topicTree, notifications, users, presets,
  onAddSummary, onUpdateSummary, onDeleteSummary, onSendNotification, onUpdateNotification, onDeleteNotification,
  onAddTopic, onUpdateTopic, onDeleteTopic, onAddPreset, onUpdatePreset, onDeletePreset, onConfirmUser, onDeleteUser, onUpdateUserPoints,
  onToggleUserVip,
  appTips, onAddTip, onDeleteTip, studyGuides, onAddStudyGuide, onUpdateStudyGuide, onDeleteStudyGuide,
  trainingQuestions, onAddTrainingQuestion, onImportTrainingQuestions, onDeleteTrainingQuestion,
  materials, onAddMaterial, onUpdateMaterial, onDeleteMaterial,
  isDesktopMode, onToggleDesktopMode, initialTab, onTabChange,
  exams, examAccessRecords, onAddExam, onUpdateExam, onDeleteExam
}) => {
  const [activeTab, setActiveTab] = useState<'summaries' | 'content' | 'messages' | 'users' | 'simulados' | 'desafios' | 'leads' | 'tips' | 'guides' | 'training' | 'materials' | 'exams'>((initialTab as any) || 'simulados');
  const [history, setHistory] = useState<AdminState[]>([]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);


  const [isCreatingSimulado, setIsCreatingSimulado] = useState(false);
  const [simuladoStep, setSimuladoStep] = useState(1);
  const [summaryContent, setSummaryContent] = useState('');
  const [topicContent, setTopicContent] = useState('');
  const [topicIsVip, setTopicIsVip] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState('root');
  const [nodeType, setNodeType] = useState<'file' | 'folder'>('file');

  // --- STATE DO SISTEMA DE MENSAGENS ---
  const [messageTarget, setMessageTarget] = useState<'all' | 'group' | 'individual'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [newMessageTitle, setNewMessageTitle] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [newMessageType, setNewMessageType] = useState<'info' | 'success' | 'warning' | 'alert'>('info');

  // --- STATE DO SISTEMA DE MATERIAIS ---
  const [isCreatingMaterial, setIsCreatingMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<AdminMaterial | null>(null);
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialCoverUrl, setNewMaterialCoverUrl] = useState('');
  const [newMaterialDescription, setNewMaterialDescription] = useState('');
  const [newMaterialDownloadUrl, setNewMaterialDownloadUrl] = useState('');
  const [newMaterialIsVip, setNewMaterialIsVip] = useState(false);

  const handleSendMessage = () => {
    if (!newMessageTitle || !newMessageContent) return;

    const baseNotification = {
      title: newMessageTitle,
      message: newMessageContent,
      time: new Date().toLocaleString('pt-BR'),
      read: false,
      type: newMessageType
    };

    if (messageTarget === 'all') {
      // Enviar para todos (sem targetUserId = global)
      onSendNotification({
        ...baseNotification,
        id: `notif_${Date.now()}`
      });
    } else {
      // Enviar para cada usuário selecionado individualmente
      selectedUserIds.forEach((userId, index) => {
        onSendNotification({
          ...baseNotification,
          id: `notif_${Date.now()}_${index}`,
          targetUserId: userId
        });
      });
    }

    // Limpar campos
    setNewMessageTitle('');
    setNewMessageContent('');
    setSelectedUserIds([]);
    setMessageTarget('all');
    alert(`Mensagem enviada com sucesso para ${messageTarget === 'all' ? 'todos os usuários' : selectedUserIds.length + ' usuário(s)'}!`);
  };

  const handleSaveMaterial = () => {
    if (!newMaterialTitle || !newMaterialDownloadUrl) {
      alert("Título e Link de Download são obrigatórios.");
      return;
    }

    const materialData: AdminMaterial = {
      id: editingMaterial?.id || `mat_${Date.now()}`,
      title: newMaterialTitle,
      coverUrl: newMaterialCoverUrl,
      description: newMaterialDescription,
      downloadUrl: newMaterialDownloadUrl,
      date: editingMaterial?.date || new Date().toLocaleDateString('pt-BR'),
      isVip: newMaterialIsVip
    };

    if (editingMaterial) {
      onUpdateMaterial(materialData);
    } else {
      onAddMaterial(materialData);
    }

    // Reset form
    setEditingMaterial(null);
    setIsCreatingMaterial(false);
    setNewMaterialTitle('');
    setNewMaterialCoverUrl('');
    setNewMaterialDescription('');
    setNewMaterialDownloadUrl('');
    setNewMaterialIsVip(false);
    alert(editingMaterial ? "Material atualizado!" : "Material adicionado!");
  };

  // --- STATE DO EDITOR DE SIMULADO ---
  const [currentPreset, setCurrentPreset] = useState<Partial<SimuladoPreset>>({
    title: '',
    description: '',
    type: 'exam',
    level: Difficulty.Medium,
    area: '',
    year: new Date().getFullYear(),
    timeLimit: 60,
    questions: [],
    status: 'draft'
  });

  // Editor de Questão Individual
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);

  // --- STATE DO EDITOR DE DICAS ---
  const [newTipContent, setNewTipContent] = useState('');
  const [newTipAuthor, setNewTipAuthor] = useState('Mentor Master');

  // --- STATE DO EDITOR DE GUIAS ---
  const [newGuideDiscipline, setNewGuideDiscipline] = useState('');
  const [editingGuideId, setEditingGuideId] = useState<string | null>(null);
  const [guideJsonContent, setGuideJsonContent] = useState('');
  const [currentProgressiveLevelIndex, setCurrentProgressiveLevelIndex] = useState(0);

  // --- STATE DE IMPORTAÇÃO ---
  const [isImportingQuestions, setIsImportingQuestions] = useState(false);
  const [importJsonContent, setImportJsonContent] = useState('');
  const [isImportingToSimulado, setIsImportingToSimulado] = useState(false);
  const [simuladoImportJson, setSimuladoImportJson] = useState('');



  const handleImportQuestions = () => {
    try {
      const parsed = JSON.parse(importJsonContent);
      if (!Array.isArray(parsed)) {
        alert("O JSON deve ser uma lista (array) de questões.");
        return;
      }

      // Basic validation
      const validQuestions: Question[] = parsed.map((q: any, idx) => ({
        id: q.id || `imported_${Date.now()}_${idx}`,
        discipline: q.discipline || 'Geral',

        text: q.text || 'Sem enunciado',
        options: Array.isArray(q.options) ? q.options : [],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.explanation || '',
        difficulty: q.difficulty || Difficulty.Medium,
        type: q.type || 'mcq',
        tags: Array.isArray(q.tags) ? q.tags : []
      }));

      if (validQuestions.length === 0) {
        alert("Nenhuma questão válida encontrada.");
        return;
      }

      onImportTrainingQuestions(validQuestions);
      setIsImportingQuestions(false);
      setImportJsonContent('');
      alert(`${validQuestions.length} questões importadas com sucesso!`);
    } catch (e) {
      alert("Erro ao ler JSON. Verifique a formatação.");
    }
  };

  // Função para abrir editor ao clicar em questão reportada
  const handleOpenReportedQuestion = (questionId: string) => {
    pushHistory();
    // Procurar a questão em trainingQuestions
    const foundQuestion = trainingQuestions.find(q => q.id === questionId);

    if (foundQuestion) {
      // Mudar para a aba de treino
      setActiveTab('training');
      // Abrir o editor com a questão encontrada
      setEditingQuestion(foundQuestion);
    } else {
      // Procurar nos presets
      for (const preset of presets) {
        const questionInPreset = preset.questions.find(q => q.id === questionId);
        if (questionInPreset) {
          setActiveTab('simulados');
          setEditingQuestion(questionInPreset);
          alert(`Questão encontrada no simulado: ${preset.title}. Editando agora.`);
          return;
        }
      }
      alert('Questão não encontrada no banco de dados. Ela pode ter sido deletada.');
    }
  };

  // Função para importar questões JSON diretamente no simulado
  const handleImportToSimulado = () => {
    try {
      const parsed = JSON.parse(simuladoImportJson);
      if (!Array.isArray(parsed)) {
        alert("O JSON deve ser uma lista (array) de questões.");
        return;
      }

      // Validação e criação de questões com valores padrão do simulado
      const validQuestions: Question[] = parsed.map((q: any, idx) => ({
        id: q.id || `imported_${Date.now()}_${idx}`,
        discipline: q.discipline || currentPreset.area || 'Geral',

        text: q.text || 'Sem enunciado',
        options: Array.isArray(q.options) ? q.options : [],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.explanation || '',
        difficulty: q.difficulty || currentPreset.level || Difficulty.Medium,
        type: q.type || 'mcq',
        tags: Array.isArray(q.tags) ? q.tags : []
      }));

      if (validQuestions.length === 0) {
        alert("Nenhuma questão válida encontrada.");
        return;
      }

      // Adicionar ao simulado atual
      setCurrentPreset(prev => ({
        ...prev,
        questions: [...(prev.questions || []), ...validQuestions]
      }));

      setIsImportingToSimulado(false);
      setSimuladoImportJson('');
      alert(`✅ ${validQuestions.length} questões importadas com sucesso!`);
    } catch (e) {
      alert("❌ Erro ao ler JSON. Verifique a formatação.");
    }
  };


  // Handlers para o Editor
  const handleSaveSimulado = () => {
    if (!currentPreset.title || currentPreset.title.trim() === '') {
      alert("O título do simulado é obrigatório. Volte ao passo 1 para preencher.");
      return;
    }

    if (currentPreset.isProgressiveWithLevels) {
      const totalQuestions = currentPreset.progressiveLevels?.reduce((acc, level) => acc + level.questions.length, 0) || 0;
      if (totalQuestions === 0) {
        alert("O desafio progressivo precisa ter pelo menos uma questão em algum nível.");
        return;
      }
    } else if (!currentPreset.questions || currentPreset.questions.length === 0) {
      alert("O simulado precisa ter pelo menos uma questão. Volte ao passo 2 para adicionar.");
      return;
    }

    // Auto-assign order for exam or challenge type if not set
    let finalOrder = currentPreset.order;
    if ((currentPreset.type === 'exam' || currentPreset.type === 'challenge') && !currentPreset.order) {
      const existingItems = presets.filter(p => p.type === currentPreset.type);
      const maxOrder = existingItems.reduce((max, e) => Math.max(max, e.order || 0), 0);
      finalOrder = maxOrder + 1;
    }

    const finalPreset = {
      ...currentPreset,
      id: currentPreset.id || `pre_${Date.now()}`,
      questionCount: currentPreset.isProgressiveWithLevels
        ? currentPreset.progressiveLevels?.reduce((acc, level) => acc + level.questions.length, 0) || 0
        : currentPreset.questions?.length || 0,
      totalPoints: 20,
      status: 'published',
      order: (currentPreset.type === 'exam' || currentPreset.type === 'challenge') ? finalOrder : undefined,
      // Force 'challenge' type if it's a specific challenge subtype
      type: currentPreset.challengeSubType ? 'challenge' : currentPreset.type
    } as SimuladoPreset;

    onAddPreset(finalPreset);
    setIsCreatingSimulado(false);
    setSimuladoStep(1);
    setCurrentPreset({ questions: [], status: 'draft', year: 2024, timeLimit: 60, scheduledDays: [] });
    const orderMsg = (currentPreset.type === 'exam' || currentPreset.type === 'challenge') && finalOrder ? ` Ordem: #${finalOrder}` : '';
    alert(`Simulado publicado com sucesso!${orderMsg}`);
  };

  // --- JSON IMPORT COMPLETO ---
  const [showFullJsonImport, setShowFullJsonImport] = useState(false);
  const [fullJsonContent, setFullJsonContent] = useState('');

  // --- NAVIGATION LOGIC ---
  const pushHistory = () => {
    const currentState: AdminState = {
      activeTab,
      isCreatingSimulado,
      simuladoStep,
      editingQuestion,
      isImportingQuestions,
      isImportingToSimulado,
      showFullJsonImport,
      editingGuideId
    };
    setHistory(prev => [...prev, currentState]);
  };

  const handleBack = () => {
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    setActiveTab(previousState.activeTab as any);
    setIsCreatingSimulado(previousState.isCreatingSimulado);
    setSimuladoStep(previousState.simuladoStep);
    setEditingQuestion(previousState.editingQuestion);
    setIsImportingQuestions(previousState.isImportingQuestions);
    setIsImportingToSimulado(previousState.isImportingToSimulado);
    setShowFullJsonImport(previousState.showFullJsonImport);
    setEditingGuideId(previousState.editingGuideId);
  };

  const handleTabChange = (tab: any) => {
    pushHistory();
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const handleFullJsonImport = () => {
    try {
      // Sanitizar entrada: remover markdown code blocks (```json ... ```) e espaços extras
      let cleanContent = fullJsonContent.trim();
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }

      const data = JSON.parse(cleanContent);

      // Processar questões para garantir IDs e formato correto
      const processedQuestions = Array.isArray(data.questions) ? data.questions.map((q: any, idx: number) => ({
        ...q,
        id: q.id || `imported_${Date.now()}_${idx}`,
        type: q.type || 'mcq',
        options: q.options || [],
        correctIndex: q.correctIndex ?? 0,
        difficulty: q.difficulty || 'Medium',
        tags: q.tags || [],
        text: q.text || '',
        explanation: q.explanation || ''
      })) : [];

      // Validar e preencher campos
      setCurrentPreset(prev => {
        const isProgressive = data.challengeSubType === 'progressive' || !!data.progressiveLevels;

        let processedProgressiveLevels = prev.progressiveLevels;
        if (isProgressive && Array.isArray(data.progressiveLevels)) {
          processedProgressiveLevels = data.progressiveLevels.map((l: any) => ({
            level: l.level || 'Médio',
            questions: Array.isArray(l.questions) ? l.questions.map((q: any, qIdx: number) => ({
              ...q,
              id: q.id || `imported_prog_${Date.now()}_${qIdx}`,
              type: q.type || 'mcq',
              options: q.options || [],
              correctIndex: q.correctIndex ?? 0,
              difficulty: l.level || 'Médio',
              tags: q.tags || [],
              text: q.text || '',
              explanation: q.explanation || ''
            })) : []
          }));
        }

        const finalQuestions = processedQuestions.length > 0 ? processedQuestions : prev.questions;
        const finalQuestionCount = isProgressive
          ? (processedProgressiveLevels?.reduce((acc, l) => acc + l.questions.length, 0) || 0)
          : (finalQuestions.length);

        return {
          ...prev,
          title: data.title !== undefined ? data.title : prev.title,
          type: isProgressive ? 'challenge' : (data.type || prev.type),
          challengeSubType: isProgressive ? 'progressive' : (data.challengeSubType || prev.challengeSubType),
          isProgressiveWithLevels: isProgressive,
          level: data.level || prev.level,
          area: data.area || prev.area,
          year: data.year ? Number(data.year) : prev.year,
          timeLimit: data.timeLimit ? Number(data.timeLimit) : prev.timeLimit,
          questions: isProgressive ? [] : finalQuestions,
          progressiveLevels: isProgressive ? processedProgressiveLevels : prev.progressiveLevels,
          questionCount: finalQuestionCount,
          readingContent: data.readingContent || prev.readingContent
        };
      });

      setShowFullJsonImport(false);
      setFullJsonContent('');
      alert(`✅ Importação concluída!\n\n📝 Título: ${data.title || 'Mantido'}\n📚 Total de Questões: ${currentPreset.questionCount}`);
    } catch (e: any) {
      console.error(e);
      alert(`❌ Erro ao ler JSON: ${e.message}\n\nDica: Verifique se copiou apenas o conteúdo entre chaves { } e se não há vírgulas sobrando no final.`);
    }
  };

  const addManualQuestion = () => {
    pushHistory();
    setEditingQuestion({
      id: `man_${Date.now()}`,
      type: 'mcq',
      text: '',
      options: ['', '', '', '', ''],
      correctIndex: 0,
      explanation: '',
      difficulty: currentPreset.isProgressiveWithLevels
        ? PROGRESSIVE_LEVELS[currentProgressiveLevelIndex] as any
        : currentPreset.level,
      discipline: currentPreset.area || 'Geral',
    });
  };

  const saveEditingQuestion = () => {
    if (!editingQuestion?.text) return;

    if (activeTab === 'training') {
      onAddTrainingQuestion(editingQuestion as Question);
      alert("Questão salva no banco de treino!");
    } else if (isCreatingSimulado) {
      const levelIdx = currentProgressiveLevelIndex;
      const isProgressive = currentPreset.challengeSubType === 'progressive' || currentPreset.isProgressiveWithLevels;

      setCurrentPreset(prev => {
        const updated = { ...prev };

        if (isProgressive) {
          // Garantir que progressiveLevels exista e tenha 6 níveis
          const currentLevels = prev.progressiveLevels && prev.progressiveLevels.length === 6
            ? prev.progressiveLevels
            : PROGRESSIVE_LEVELS.map(level => ({ level, questions: [] }));

          const newLevels = currentLevels.map((l, idx) => {
            if (idx !== levelIdx) return l;

            const questions = [...(l.questions || [])];
            const existingIdx = questions.findIndex(q => q.id === editingQuestion.id);
            if (existingIdx >= 0) {
              questions[existingIdx] = editingQuestion as Question;
            } else {
              questions.push(editingQuestion as Question);
            }
            return { ...l, questions };
          });

          updated.isProgressiveWithLevels = true;
          updated.progressiveLevels = newLevels;
        } else {
          const questions = [...(prev.questions || [])];
          const existingIdx = questions.findIndex(q => q.id === editingQuestion.id);
          if (existingIdx >= 0) {
            questions[existingIdx] = editingQuestion as Question;
          } else {
            questions.push(editingQuestion as Question);
          }
          updated.questions = questions;
        }

        return updated;
      });
    }
    setEditingQuestion(null);
  };

  const handleEditSimulado = (preset: SimuladoPreset) => {
    pushHistory();
    setCurrentPreset(preset);
    setIsCreatingSimulado(true);
    setSimuladoStep(1);
  };

  // --- RENDERS ---

  const renderSimuladoEditor = () => (
    <div className="flex flex-col h-full animate-page-enter">
      {/* Stepper Superior */}
      <div className="flex items-center justify-between mb-8 px-4 bg-slate-900/50 p-4 rounded-3xl border border-white/5">
        {[
          { step: 1, label: 'DNA da Prova', icon: Settings },
          { step: 2, label: 'Curadoria', icon: Layers },
          { step: 3, label: 'Revisão', icon: Eye }
        ].map(item => (
          <div key={item.step} className={`flex items-center gap-2 ${simuladoStep === item.step ? 'text-brand-purple' : 'text-slate-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${simuladoStep === item.step ? 'bg-brand-purple text-white' : 'bg-slate-800'}`}>
              <item.icon size={14} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Passo 1: DNA */}
      {simuladoStep === 1 && (
        <div className="space-y-6 animate-fade-in">
          {/* Header com botões de ação */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => {
                pushHistory();
                setIsCreatingSimulado(false);
                setSimuladoStep(1);
                setCurrentPreset({ questions: [], status: 'draft', year: new Date().getFullYear(), timeLimit: 60, scheduledDays: [] });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-all border border-white/10"
            >
              <ArrowLeft size={14} />
              Voltar
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const isProgressive = currentPreset.challengeSubType === 'progressive' || currentPreset.isProgressiveWithLevels;

                  const baseJson: any = {
                    type: isProgressive ? "challenge" : (currentPreset.type || "exam"),
                    challengeSubType: currentPreset.challengeSubType || undefined,
                    level: "Médio",
                    title: currentPreset.title || "Título da Prova",
                    area: currentPreset.area || "Matemática",
                    year: new Date().getFullYear(),
                    timeLimit: currentPreset.timeLimit || 60,
                  };

                  if (isProgressive) {
                    baseJson.progressiveLevels = PROGRESSIVE_LEVELS.map(level => ({
                      level,
                      questions: [
                        {
                          text: `Pergunta de nível ${level}?`,
                          options: ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
                          correctIndex: 0,
                          explanation: "Explicação aqui.",
                          discipline: currentPreset.area || "Matemática",
                          difficulty: level
                        }
                      ]
                    }));
                  } else {
                    if (currentPreset.type === 'exam') baseJson.order = 1;

                    // Add readingContent for reading challenges
                    if (currentPreset.challengeSubType === 'reading') {
                      baseJson.readingContent = "Adicione aqui o texto que o aluno deverá ler.\n\nVocê pode usar LaTeX para fórmulas: $x^2 + y^2 = z^2$";
                    }

                    baseJson.questions = [
                      {
                        text: "Texto da pergunta aqui?",
                        options: ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
                        correctIndex: 0,
                        explanation: "Explicação da resposta correta.",
                        discipline: currentPreset.area || "Matemática",
                        difficulty: "Médio"
                      }
                    ];
                  }

                  const jsonExample = JSON.stringify(baseJson, null, 2);
                  navigator.clipboard.writeText(jsonExample);
                  alert('✅ Formato JSON copiado! O tipo foi configurado como: ' + (isProgressive ? 'Desafio Progressivo' : currentPreset.type === 'exam' ? 'Prova Oficial' : 'Desafio'));
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple rounded-xl text-xs font-bold uppercase transition-all border border-brand-purple/30"
              >
                <Copy size={14} />
                Copiar Formato
              </button>

              <button
                onClick={() => setShowFullJsonImport(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-bold uppercase transition-all border border-blue-500/30"
              >
                <Database size={14} />
                Importar JSON
              </button>
            </div>
          </div>

          {/* Modal de Importação JSON */}
          {showFullJsonImport && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-2xl space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Database className="text-blue-500" /> Importar Prova Via JSON
                  </h3>
                  <button onClick={() => setShowFullJsonImport(false)} className="p-2 hover:bg-white/10 rounded-full">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4">
                  <p className="text-xs text-blue-300 leading-relaxed">
                    Cole o JSON completo da prova. Campos suportados: <code className="bg-black/30 px-1 rounded">title</code>, <code className="bg-black/30 px-1 rounded">year</code>, <code className="bg-black/30 px-1 rounded">area</code>, <code className="bg-black/30 px-1 rounded">questions</code> (array).
                  </p>
                </div>

                <textarea
                  value={fullJsonContent}
                  onChange={(e) => setFullJsonContent(e.target.value)}
                  placeholder='{ "title": "Prova X", "year": 2024, "questions": [...] }'
                  className="w-full h-64 bg-black/30 border border-white/10 rounded-2xl p-4 text-white font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowFullJsonImport(false)}
                    className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleFullJsonImport}
                    disabled={!fullJsonContent.trim()}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold uppercase text-xs shadow-glow disabled:opacity-50"
                  >
                    Processar Importação
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="glass-card p-8 rounded-[2.5rem] border border-white/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type is now automatically set based on the tab */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Nível de Dificuldade</label>
                <select
                  value={currentPreset.level}
                  onChange={e => setCurrentPreset({ ...currentPreset, level: e.target.value as Difficulty })}
                  className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 outline-none text-sm"
                >
                  <option value={Difficulty.Easy}>Fácil</option>
                  <option value={Difficulty.Medium}>Médio</option>
                  <option value={Difficulty.Hard}>Difícil</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Título do Simulado</label>
                <input type="text" value={currentPreset.title} onChange={e => setCurrentPreset({ ...currentPreset, title: e.target.value })} placeholder="Ex: SEFAZ 2024 - Auditor" className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-brand-purple text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Disciplina Principal</label>
                <select
                  value={currentPreset.area}
                  onChange={e => setCurrentPreset({ ...currentPreset, area: e.target.value })}
                  className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 outline-none text-sm"
                >
                  <option value="">Selecione uma Disciplina</option>
                  {['Matemática', 'Língua Portuguesa', 'Didáctica da Matemática', 'Didáctica da Língua Portuguesa', 'Geral'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Ano</label>
                <input type="number" value={currentPreset.year} onChange={e => setCurrentPreset({ ...currentPreset, year: parseInt(e.target.value) })} className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tempo (Min)</label>
                <input
                  type="number"
                  value={currentPreset.timeLimit || ''}
                  onChange={e => {
                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                    setCurrentPreset({ ...currentPreset, timeLimit: val });
                  }}
                  className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 outline-none text-sm"
                  placeholder="Ex: 60"
                />
              </div>
            </div>


            {currentPreset.type === 'exam' && (
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Ordem Sequencial (🔒 Desbloqueio)</label>
                <p className="text-[9px] text-slate-400 ml-2">Provas são desbloqueadas em sequência. A prova #1 está sempre disponível, a #2 só após completar a #1, etc.</p>
                <input
                  type="number"
                  min="1"
                  value={currentPreset.order || 1}
                  onChange={e => setCurrentPreset({ ...currentPreset, order: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 outline-none text-sm"
                  placeholder="Ex: 1, 2, 3..."
                />
              </div>
            )}

            {currentPreset.type === 'challenge' && (
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Ordem Sequencial (🔒 Desbloqueio)</label>
                <p className="text-[9px] text-slate-400 ml-2">Desafios são desbloqueados em sequência. O desafio #1 está sempre disponível, o #2 só após completar o #1, etc.</p>
                <input
                  type="number"
                  min="1"
                  value={currentPreset.order || 1}
                  onChange={e => setCurrentPreset({ ...currentPreset, order: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 outline-none text-sm"
                  placeholder="Ex: 1, 2, 3..."
                />
              </div>
            )}

            {currentPreset.challengeSubType === 'reading' && (
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">📖 Conteúdo para Leitura</label>
                <p className="text-[9px] text-slate-400 ml-2">Adicione o conteúdo que o aluno deverá ler durante este desafio.</p>
                <textarea
                  value={currentPreset.readingContent || ''}
                  onChange={e => setCurrentPreset({ ...currentPreset, readingContent: e.target.value })}
                  className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 outline-none text-sm min-h-[200px] font-mono"
                  placeholder="Adicione aqui o texto, artigo ou material que o aluno deve ler...\n\nVocê pode usar LaTeX para fórmulas matemáticas: $x^2 + y^2 = z^2$"
                />
              </div>
            )}

            {/* VIP Toggle */}
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <input
                type="checkbox"
                id="preset-vip-toggle"
                checked={currentPreset.isVip || false}
                onChange={(e) => setCurrentPreset({ ...currentPreset, isVip: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-800 border-amber-500/50 text-amber-500 focus:ring-2 focus:ring-amber-500/50"
              />
              <label htmlFor="preset-vip-toggle" className="flex items-center gap-2 cursor-pointer">
                <Trophy size={18} className="text-amber-500" />
                <div>
                  <p className="text-sm font-bold text-amber-500">Marcar como VIP</p>
                  <p className="text-[10px] text-slate-400">Apenas usuários VIP poderão acessar</p>
                </div>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button className="flex-1 py-4 bg-brand-purple border-none rounded-2xl font-black uppercase" onClick={() => setSimuladoStep(2)}>Próximo: Gerenciar Questões</Button>
            </div>
          </section>
        </div>
      )}

      {/* Passo 2: Curadoria */}
      {simuladoStep === 2 && (
        <div className="space-y-6 animate-fade-in pb-20">
          <div className="flex flex-col gap-4">
            <button onClick={addManualQuestion} className="w-full bg-brand-purple/10 hover:bg-brand-purple/20 border border-brand-purple/20 p-8 rounded-[2rem] transition-all group flex items-center gap-6">
              <div className="w-16 h-16 bg-brand-purple rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-glow-purple">
                <Plus size={32} />
              </div>
              <div className="text-left">
                <h4 className="font-black text-lg text-white">Criar Questão Manual</h4>
                <p className="text-xs text-brand-purple uppercase font-bold tracking-wider mt-1">Adicione questões personalizadas</p>
              </div>
            </button>

            <div className="flex gap-4">
              <button onClick={() => setIsImportingToSimulado(true)} className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 p-8 rounded-[2rem] transition-all group flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-glow">
                  <Upload size={32} />
                </div>
                <div className="text-left">
                  <h4 className="font-black text-lg text-white">Importar Questões JSON</h4>
                  <p className="text-xs text-blue-400 uppercase font-bold tracking-wider mt-1">Cole questões em lote</p>
                </div>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(SIMULADO_QUESTIONS_EXAMPLE);
                  alert('✅ Exemplo de JSON copiado!');
                }}
                className="w-32 bg-brand-purple/10 hover:bg-brand-purple/20 border border-brand-purple/20 rounded-[2rem] transition-all group flex flex-col items-center justify-center gap-2 p-4"
                title="Copiar exemplo de JSON"
              >
                <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-glow-purple">
                  <Copy size={20} />
                </div>
                <span className="text-[10px] font-black uppercase text-brand-purple text-center leading-tight">Copiar<br />Exemplo</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {currentPreset.isProgressiveWithLevels ? (
              <div className="space-y-4">
                <div className="flex overflow-x-auto no-scrollbar gap-2 p-1 bg-slate-900/50 rounded-2xl border border-white/5">
                  {PROGRESSIVE_LEVELS.map((level, idx) => (
                    <button
                      key={level}
                      onClick={() => setCurrentProgressiveLevelIndex(idx)}
                      className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${currentProgressiveLevelIndex === idx ? 'bg-brand-purple text-white shadow-glow-purple' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {level} ({currentPreset.progressiveLevels?.[idx]?.questions?.length || 0})
                    </button>
                  ))}
                </div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-2">
                  <ListChecks size={14} /> Questões do Nível: {PROGRESSIVE_LEVELS[currentProgressiveLevelIndex]}
                </h3>
              </div>
            ) : (
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ListChecks size={14} /> Questões do Simulado ({currentPreset.questions?.length || 0})
              </h3>
            )}

            {(currentPreset.isProgressiveWithLevels
              ? currentPreset.progressiveLevels?.[currentProgressiveLevelIndex].questions || []
              : currentPreset.questions || []
            ).map((q, idx) => (
              <div key={q.id} className="bg-slate-900 border border-white/5 rounded-3xl p-5 flex items-start gap-4 group">
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-brand-purple">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white line-clamp-2">{q.text}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[8px] font-black bg-white/5 px-2 py-0.5 rounded uppercase">{q.difficulty}</span>
                    <span className="text-[8px] font-black bg-white/5 px-2 py-0.5 rounded uppercase text-brand-purple">{q.discipline}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      pushHistory();
                      setEditingQuestion(q);
                    }}
                    className="p-3 text-slate-500 hover:text-brand-purple transition-colors"
                    title="Editar questão"
                  ><Edit3 size={18} /></button>
                  <button
                    onClick={() => {
                      if (currentPreset.isProgressiveWithLevels) {
                        const newLevels = [...(currentPreset.progressiveLevels || [])];
                        newLevels[currentProgressiveLevelIndex].questions = newLevels[currentProgressiveLevelIndex].questions.filter(item => item.id !== q.id);
                        setCurrentPreset({ ...currentPreset, progressiveLevels: newLevels });
                      } else {
                        setCurrentPreset(prev => ({ ...prev, questions: prev.questions?.filter(item => item.id !== q.id) }));
                      }
                    }}
                    className="p-3 text-slate-500 hover:text-red-500 transition-colors"
                    title="Remover questão"
                  ><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-10 pb-20 flex gap-4">
            <Button variant="secondary" className="flex-1 py-4 bg-slate-800 text-white border-none rounded-2xl font-black uppercase" onClick={() => setSimuladoStep(1)}>Voltar</Button>
            <Button className="flex-[2] py-4 bg-brand-purple border-none rounded-2xl font-black uppercase shadow-glow-purple" onClick={() => setSimuladoStep(3)}>Finalizar Edição</Button>
          </div>
        </div>
      )}

      {/* Passo 3: Revisão & Publicação */}
      {simuladoStep === 3 && (
        <div className="space-y-8 animate-fade-in pb-20">
          <section className="glass-card p-8 rounded-[3rem] border border-white/10">
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-white/5">
              <div className="w-16 h-16 bg-brand-purple/20 rounded-[1.5rem] flex items-center justify-center text-brand-purple shadow-glow">
                <Trophy size={32} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white break-words">{currentPreset.title}</h2>
                <p className="text-xs text-slate-500 uppercase font-bold">{currentPreset.area} • {currentPreset.year}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-brand-purple uppercase mb-1">Questões</p>
                <p className="text-xl font-black text-white">{currentPreset.questions?.length}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-brand-purple uppercase mb-1">Tempo</p>
                <p className="text-xl font-black text-white">{currentPreset.timeLimit}m</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-brand-purple uppercase mb-1">Dificuldade</p>
                <p className="text-xl font-black text-white">{currentPreset.level}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-brand-green uppercase mb-1">Total Pontos</p>
                <p className="text-xl font-black text-white">20</p>
              </div>
            </div>


            <div className="bg-brand-green/10 border border-brand-green/20 rounded-3xl p-6 flex items-start gap-4">
              <div className="p-2 bg-brand-green rounded-xl text-white"><CheckCircle2 size={24} /></div>
              <div>
                <h4 className="font-bold text-white text-sm">Pronto para Publicar</h4>
                <p className="text-xs text-slate-400 mt-1">O simulado será disponibilizado imediatamente para todos os alunos no modo {currentPreset.type === 'exam' ? 'Prova Oficial' : currentPreset.type === 'challenge' ? 'Desafio Temático' : 'Simulado'}.</p>
              </div>
            </div>
          </section>

          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1 py-4 bg-slate-800 text-white border-none rounded-2xl font-black uppercase" onClick={() => setSimuladoStep(2)}>Editar Questões</Button>
            <Button className="flex-[2] py-4 bg-brand-green border-none rounded-2xl font-black uppercase shadow-glow" onClick={handleSaveSimulado}>Publicar Simulado</Button>
          </div>
        </div>
      )}

    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col animate-fade-in font-sans">
      <header className="p-6 bg-slate-900/80 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {history.length > 0 && (
            <button
              onClick={handleBack}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-slate-400"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-brand-purple" size={18} />
              <h1 className="text-lg font-black tracking-tight uppercase">Aprovado Control</h1>
            </div>
            <p className="text-[9px] text-brand-purple font-bold uppercase tracking-[0.2em] opacity-80">Painel do Administrador</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/30 transition-all text-red-500 hover:text-white"
            title="Sair do Painel Admin"
          >
            <LogOut size={18} />
            <span className="text-[10px] font-black uppercase hidden sm:block">Sair</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(LATEX_PROMPT_GUIDE);
              alert("Prompt para IA copiado com sucesso! Use-o no ChatGPT ou Gemini para gerar conteúdo formatado.");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-purple/20 hover:bg-brand-purple/30 rounded-xl border border-brand-purple/30 transition-all text-brand-purple hover:text-white"
            title="Copiar Prompt para Gerar Conteúdo com IA"
          >
            <Sparkles size={18} />
            <span className="text-[10px] font-black uppercase hidden sm:block">Prompt IA</span>
          </button>

          <button
            onClick={() => onToggleDesktopMode(!isDesktopMode)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-slate-400 hover:text-white"
            title={isDesktopMode ? "Mudar para visão Mobile" : "Mudar para visão Desktop"}
          >
            {isDesktopMode ? <Smartphone size={18} /> : <Monitor size={18} />}
            <span className="text-[10px] font-black uppercase hidden sm:block">
              {isDesktopMode ? 'Modo Mobile' : 'Modo Desktop'}
            </span>
          </button>

          {!isCreatingSimulado && (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-purple to-indigo-600 flex items-center justify-center border border-white/20 shadow-glow-purple">
              <Activity size={18} className="animate-pulse" />
            </div>
          )}
        </div>
      </header>

      {!isCreatingSimulado ? (
        <>
          <nav className="flex overflow-x-auto no-scrollbar p-3 bg-slate-900/40 border-b border-white/5 gap-2 px-6">
            {[
              { id: 'summaries', label: 'Resumos', icon: Zap },
              { id: 'content', label: 'Matérias', icon: Database },
              { id: 'simulados', label: 'Simulados', icon: ListChecks },
              { id: 'exams', label: 'Exames', icon: FileText },
              { id: 'desafios', label: 'Desafios', icon: Target },
              { id: 'messages', label: 'Mensagens', icon: Send },
              { id: 'users', label: 'Alunos', icon: Users },
              { id: 'leads', label: 'Leads', icon: UserCheck },
              { id: 'tips', label: 'Dicas', icon: Sparkles },
              { id: 'guides', label: 'Guias', icon: BookOpen },
              { id: 'training', label: 'Treinar', icon: Target },
              { id: 'materials', label: 'Materiais', icon: Folder }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all border
                   ${activeTab === tab.id ? 'bg-brand-purple border-brand-purple/50 text-white shadow-glow-purple' : 'text-slate-400 border-transparent hover:bg-white/5'}`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </nav>

          <main className="flex-1 p-6 space-y-8 pb-32 max-w-4xl mx-auto w-full">
            {activeTab === 'simulados' && (
              <div className="space-y-8 animate-page-enter">
                <section className="glass-card rounded-[2.5rem] p-8 border border-white/10 bg-yellow-500/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><Trophy size={100} /></div>
                  <h2 className="text-xl font-bold mb-2">🏆 Provas Oficiais</h2>
                  <p className="text-xs text-slate-400 max-w-xs mb-8">Crie provas oficiais que contam para o ranking e pontuação dos alunos.</p>
                  <Button className="py-4 px-8 rounded-2xl bg-yellow-500 hover:bg-yellow-600 border-none shadow-lg font-black text-sm flex items-center gap-2 text-black" onClick={() => {
                    setCurrentPreset({ ...currentPreset, type: 'exam' });
                    setIsCreatingSimulado(true);
                  }}>
                    <Plus size={18} /> NOVA PROVA OFICIAL
                  </Button>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Provas Oficiais Ativas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {presets.filter(p => p.type === 'exam').map(p => (
                      <div key={p.id} className="bg-slate-900 border border-white/5 rounded-[2rem] p-6 group transition-all hover:border-yellow-500/50">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 rounded-2xl bg-yellow-500/20 text-yellow-500">
                            <Trophy size={24} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditSimulado(p)} className="p-2 text-slate-500 hover:text-white transition-colors"><Edit3 size={18} /></button>
                            <button onClick={() => onDeletePreset(p.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                          </div>
                        </div>
                        <h4 className="font-bold text-white mb-1">{p.title}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{p.area} • {p.questionCount} Questões • Ordem #{p.order || '?'}</p>
                      </div>
                    ))}
                    {presets.filter(p => p.type === 'exam').length === 0 && (
                      <p className="text-slate-500 text-sm col-span-2 text-center py-8">Nenhuma prova oficial criada ainda.</p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Aba de Desafios */}
            {activeTab === 'desafios' && (
              <div className="space-y-8 animate-page-enter">
                <section className="glass-card rounded-[2.5rem] p-8 border border-white/10 bg-red-500/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><Target size={100} /></div>
                  <h2 className="text-xl font-bold mb-2">🎯 Tipos de Desafios</h2>
                  <p className="text-xs text-slate-400 max-w-md mb-6">Escolha o tipo de desafio que deseja criar. Cada tipo tem mecânicas únicas para engajar os alunos.</p>

                  {/* Challenge Type Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Progressive */}
                    <button onClick={() => {
                      setCurrentPreset({
                        ...currentPreset,
                        type: 'challenge',
                        challengeSubType: 'progressive',
                        isProgressiveWithLevels: true,
                        progressiveLevels: PROGRESSIVE_LEVELS.map(level => ({ level, questions: [] }))
                      });
                      setIsCreatingSimulado(true);
                    }} className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-5 text-left hover:border-green-400 transition-all group">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} className="text-white" />
                      </div>
                      <h3 className="font-bold text-white mb-1">📈 Progressivo</h3>
                      <p className="text-[10px] text-slate-400">Dificuldade aumenta ao acertar. Começa fácil, fica difícil!</p>
                    </button>

                    {/* Timed */}
                    <button onClick={() => {
                      setCurrentPreset({ ...currentPreset, type: 'challenge', challengeSubType: 'timed' });
                      setIsCreatingSimulado(true);
                    }} className="bg-gradient-to-br from-orange-500/20 to-amber-600/20 border border-orange-500/30 rounded-2xl p-5 text-left hover:border-orange-400 transition-all group">
                      <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Clock size={24} className="text-white" />
                      </div>
                      <h3 className="font-bold text-white mb-1">⏱️ Contra o Tempo</h3>
                      <p className="text-[10px] text-slate-400">Cronômetro regressivo. Acabe antes do tempo zerar!</p>
                    </button>


                    {/* Reading */}
                    <button onClick={() => {
                      setCurrentPreset({ ...currentPreset, type: 'challenge', challengeSubType: 'reading' });
                      setIsCreatingSimulado(true);
                    }} className="bg-gradient-to-br from-cyan-500/20 to-teal-600/20 border border-cyan-500/30 rounded-2xl p-5 text-left hover:border-cyan-400 transition-all group">
                      <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <BookOpen size={24} className="text-white" />
                      </div>
                      <h3 className="font-bold text-white mb-1">📖 Ler Conteúdo</h3>
                      <p className="text-[10px] text-slate-400">Leia e estude o conteúdo antes de responder questões.</p>
                    </button>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Desafios Ativos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {presets.filter(p => p.type === 'challenge').map(p => {
                      const subtypeLabels: Record<string, { icon: string, color: string }> = {
                        progressive: { icon: '📈', color: 'green' },
                        timed: { icon: '⏱️', color: 'orange' },
                        endurance: { icon: '💪', color: 'red' },
                        reading: { icon: '📖', color: 'cyan' }
                      };
                      const subtype = subtypeLabels[p.challengeSubType || 'progressive'] || subtypeLabels.progressive;

                      return (
                        <div key={p.id} className={`bg-slate-900 border border-white/5 rounded-[2rem] p-6 group transition-all hover:border-${subtype.color}-500/50`}>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-2xl bg-${subtype.color}-500/20 text-${subtype.color}-500`}>
                                <Target size={24} />
                              </div>
                              {p.order && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-white/10">
                                  <span className="text-xs font-black text-white">#{p.order}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <span className="text-lg">{subtype.icon}</span>
                              <button onClick={() => handleEditSimulado(p)} className="p-2 text-slate-500 hover:text-white transition-colors"><Edit3 size={18} /></button>
                              <button onClick={() => onDeletePreset(p.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                            </div>
                          </div>
                          <h4 className="font-bold text-white mb-1">{p.title}</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{p.area} • {p.questionCount} Questões</p>
                        </div>
                      );
                    })}
                    {presets.filter(p => p.type === 'challenge').length === 0 && (
                      <p className="text-slate-500 text-sm col-span-2 text-center py-8">Nenhum desafio criado ainda. Escolha um tipo acima!</p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Aba de Mensagens Completa */}
            {activeTab === 'messages' && (
              <div className="space-y-6 animate-page-enter">
                {/* Composer de Nova Mensagem */}
                <section className="glass-card rounded-[2.5rem] p-6 border border-white/10 space-y-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-purple/20 rounded-xl flex items-center justify-center">
                      <Send size={18} className="text-brand-purple" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Nova Mensagem</h3>
                      <p className="text-[10px] text-slate-500 uppercase">Envie notificações para usuários</p>
                    </div>
                  </div>

                  {/* Seleção de Destinatários */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Destinatários</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setMessageTarget('all')}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase transition-all border ${messageTarget === 'all' ? 'bg-brand-purple border-brand-purple text-white' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800'}`}
                      >
                        <Globe size={14} className="inline mr-2" />Todos
                      </button>
                      <button
                        onClick={() => setMessageTarget('group')}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase transition-all border ${messageTarget === 'group' ? 'bg-brand-purple border-brand-purple text-white' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800'}`}
                      >
                        <Users size={14} className="inline mr-2" />Grupo
                      </button>
                      <button
                        onClick={() => setMessageTarget('individual')}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase transition-all border ${messageTarget === 'individual' ? 'bg-brand-purple border-brand-purple text-white' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800'}`}
                      >
                        <Target size={14} className="inline mr-2" />Individual
                      </button>
                    </div>
                  </div>

                  {/* Seleção de Usuários (para grupo ou individual) */}
                  {(messageTarget === 'group' || messageTarget === 'individual') && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2">
                          {messageTarget === 'individual' ? 'Selecione o Usuário' : 'Selecione os Usuários'}
                        </label>
                        {messageTarget === 'group' && (
                          <div className="flex items-center gap-2">
                            {selectedUserIds.length > 0 && (
                              <span className="text-[10px] font-bold text-brand-purple">{selectedUserIds.length} selecionado(s)</span>
                            )}
                            <button
                              onClick={() => {
                                const filteredUsers = users.filter(u => u.role === 'user' && (u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(userSearchQuery.toLowerCase())));
                                if (selectedUserIds.length === filteredUsers.length) {
                                  setSelectedUserIds([]);
                                } else {
                                  setSelectedUserIds(filteredUsers.map(u => u.id));
                                }
                              }}
                              className="text-[10px] font-bold text-brand-purple hover:underline uppercase"
                            >
                              {selectedUserIds.length > 0 && selectedUserIds.length === users.filter(u => u.role === 'user' && (u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))).length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Busca */}
                      <div className="relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Buscar usuário por nome ou email..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-purple/50"
                        />
                      </div>

                      {/* Lista de Usuários */}
                      <div className="max-h-48 overflow-y-auto space-y-2 rounded-2xl bg-slate-900/50 p-3">
                        {users.filter(u => u.role === 'user' && (u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))).map(user => (
                          <button
                            key={user.id}
                            onClick={() => {
                              if (messageTarget === 'individual') {
                                setSelectedUserIds([user.id]);
                              } else {
                                setSelectedUserIds(prev =>
                                  prev.includes(user.id)
                                    ? prev.filter(id => id !== user.id)
                                    : [...prev, user.id]
                                );
                              }
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedUserIds.includes(user.id) ? 'bg-brand-purple/20 border border-brand-purple/30' : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'}`}
                          >
                            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-lg object-cover" />
                            <div className="flex-1 text-left">
                              <p className="text-xs font-bold text-white">{user.fullName}</p>
                              <p className="text-[10px] text-slate-500">{user.email}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${selectedUserIds.includes(user.id) ? 'bg-brand-purple' : 'bg-slate-700'}`}>
                              {selectedUserIds.includes(user.id) && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                          </button>
                        ))}
                        {users.filter(u => u.role === 'user').length === 0 && (
                          <p className="text-center text-slate-500 text-xs py-4">Nenhum usuário encontrado</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tipo de Notificação */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tipo</label>
                    <div className="flex gap-2">
                      {[
                        { type: 'info', label: 'Info', color: 'bg-blue-500' },
                        { type: 'success', label: 'Sucesso', color: 'bg-brand-green' },
                        { type: 'warning', label: 'Aviso', color: 'bg-yellow-500' },
                        { type: 'alert', label: 'Alerta', color: 'bg-red-500' }
                      ].map(t => (
                        <button
                          key={t.type}
                          onClick={() => setNewMessageType(t.type as any)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${newMessageType === t.type ? `${t.color} border-transparent text-white` : 'bg-slate-800/50 border-white/5 text-slate-400'}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Título e Mensagem */}
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Título da mensagem..."
                      value={newMessageTitle}
                      onChange={(e) => setNewMessageTitle(e.target.value)}
                      className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-purple/50"
                    />
                    <textarea
                      placeholder="Conteúdo da mensagem..."
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      className="w-full h-24 bg-slate-800/50 border border-white/5 rounded-xl py-3 px-4 text-sm outline-none resize-none focus:ring-2 focus:ring-brand-purple/50"
                    />
                  </div>

                  {/* Botão Enviar */}
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessageTitle || !newMessageContent || (messageTarget !== 'all' && selectedUserIds.length === 0)}
                    className="w-full py-4 bg-brand-purple border-none rounded-2xl font-black uppercase shadow-glow-purple disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} className="mr-2" />
                    {messageTarget === 'all' ? 'Enviar para Todos' : messageTarget === 'group' ? `Enviar para ${selectedUserIds.length} Usuário(s)` : 'Enviar Mensagem'}
                  </Button>
                </section>

                {/* Histórico de Mensagens */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4 flex items-center gap-2">
                    <History size={14} /> Mensagens Enviadas ({notifications.length})
                  </h3>

                  {notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.map(n => {
                        // Renderização especial para reportes de questões
                        if (n.type === 'question_report' && n.questionData) {
                          return (
                            <div key={n.id} className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-2 border-orange-500/30 rounded-2xl p-5 group animate-pulse-slow">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                                    <AlertCircle size={20} className="text-white" />
                                  </div>
                                  <div>
                                    <h4 className="font-black text-sm text-white flex items-center gap-2">
                                      {n.title}
                                      <span className="text-[8px] bg-orange-500 text-white px-2 py-1 rounded uppercase font-bold">Urgente</span>
                                    </h4>
                                    <p className="text-[10px] text-orange-400 font-bold">Reportado por: {n.questionData.reportedBy}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => onDeleteNotification(n.id)}
                                  className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              <div className="bg-black/30 rounded-xl p-4 space-y-3 border border-orange-500/20">
                                <div>
                                  <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Questão Reportada</p>
                                  <p className="text-xs text-white leading-relaxed">{n.questionData.questionText.substring(0, 150)}...</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase">Disciplina</p>
                                    <p className="text-xs text-white font-bold">{n.questionData.discipline}</p>
                                  </div>

                                </div>

                                <div>
                                  <p className="text-[9px] font-black text-slate-500 uppercase">ID da Questão</p>
                                  <p className="text-[10px] text-brand-purple font-mono font-bold">{n.questionData.questionId}</p>
                                </div>

                                <div className="pt-2 border-t border-white/10">
                                  <p className="text-[10px] text-slate-500">
                                    Reportado em: <span className="text-orange-400 font-bold">{n.questionData.reportedAt}</span>
                                  </p>
                                </div>

                                {/* Botão para Corrigir a Questão */}
                                <button
                                  onClick={() => handleOpenReportedQuestion(n.questionData!.questionId)}
                                  className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
                                >
                                  <Edit3 size={16} />
                                  Corrigir
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // Renderização normal para outras notificações
                        return (
                          <div key={n.id} className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex items-start gap-4 group">
                            <div className={`w-2 h-2 rounded-full mt-2 ${n.type === 'success' ? 'bg-brand-green' : n.type === 'warning' ? 'bg-yellow-500' : n.type === 'alert' ? 'bg-red-500' : 'bg-blue-500'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-sm text-white">{n.title}</h4>
                                {n.targetUserId && <span className="text-[8px] bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded uppercase font-bold">Individual</span>}
                                {!n.targetUserId && <span className="text-[8px] bg-white/10 text-slate-400 px-2 py-0.5 rounded uppercase font-bold">Global</span>}
                              </div>
                              <div className="text-xs text-slate-400 line-clamp-2">
                                <LatexRenderer content={n.message} previewMode={true} />
                              </div>
                              <p className="text-[10px] text-slate-600 mt-2">{n.time}</p>
                            </div>
                            <button
                              onClick={() => onDeleteNotification(n.id)}
                              className="p-2 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Send size={40} className="mx-auto mb-4 text-slate-700" />
                      <p className="text-slate-500 text-sm">Nenhuma mensagem enviada ainda</p>
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'users' && (
              <AdminUsersTab
                users={users}
                getUserLevel={getUserLevel}
                getNextLevel={getNextLevel}
                onUpdateUserPoints={onUpdateUserPoints}
                onToggleUserVip={onToggleUserVip}
              />
            )}

            {activeTab === 'exams' && (
              <AdminExamsTab
                exams={exams}
                accessRecords={examAccessRecords}
                users={users}
                onAddExam={onAddExam}
                onUpdateExam={onUpdateExam}
                onDeleteExam={onDeleteExam}
              />
            )}

            {/* Aba de Leads (Cadastros) */}
            {activeTab === 'leads' && (
              <div className="space-y-6 animate-page-enter">
                <section className="space-y-4">
                  <div className="flex items-center justify-between px-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                      <UserCheck size={14} /> Novos Leads ({users.filter(u => u.role === 'user').length})
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {users.filter(u => u.role === 'user').sort((a, b) => {
                      const timeA = a.onboardingData?.timestamp ? new Date(a.onboardingData.timestamp).getTime() : 0;
                      const timeB = b.onboardingData?.timestamp ? new Date(b.onboardingData.timestamp).getTime() : 0;
                      return timeB - timeA;
                    }).map(user => (
                      <div key={user.id} className="bg-slate-900 border border-white/5 rounded-[2rem] overflow-hidden group transition-all hover:border-brand-purple/30">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                            <div>
                              <h4 className="font-black text-white">{user.fullName}</h4>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {user.onboardingData?.email || user.email || 'Email não disponível'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Senha Registrada</p>
                            <p className="text-sm font-mono text-brand-purple font-bold">
                              {user.onboardingData?.raw_password || user.password || '---'}
                            </p>
                          </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                              <BrainCircuit size={12} /> Dificuldades
                            </div>
                            <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                              <p className="text-xs text-slate-300 leading-relaxed italic">
                                "{user.onboardingData?.difficulties || 'Não respondeu'}"
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                              <Target size={12} /> Expectativas
                            </div>
                            <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                              <p className="text-xs text-slate-300 leading-relaxed italic">
                                "{user.onboardingData?.expectations || 'Não respondeu'}"
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="px-6 py-3 bg-black/40 flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
                              ID: {user.id}
                            </span>
                            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
                              {user.onboardingData?.timestamp ? new Date(user.onboardingData.timestamp).toLocaleString('pt-BR') : 'Data não disponível'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                const email = user.onboardingData?.email;
                                const pwd = user.onboardingData?.raw_password;

                                if (!email || !pwd) {
                                  alert(`Dados de login não disponíveis.\n\nDetalhes encontrados:\nEmail: ${email || 'N/A'}\nSenha: ${pwd ? '******' : 'N/A'}\n\nNota: Isso só funciona para usuários criados após a atualização de captura.`);
                                  console.log('Dados do usuário:', user);
                                  return;
                                }

                                if (window.confirm(`Você entrará na conta de ${user.fullName}. \n\n⚠️ ATENÇÃO: Sua sessão de Admin será ENCERRADA.\nVocê precisará fazer login como Admin novamente depois.\n\nContinuar?`)) {
                                  const { error } = await supabase.auth.signOut();
                                  if (!error) {
                                    const { error: loginError } = await supabase.auth.signInWithPassword({
                                      email: email,
                                      password: pwd
                                    });
                                    if (loginError) {
                                      alert('Erro ao entrar na conta: ' + loginError.message);
                                      // Tentar relogar admin se falhar? Difícil sem credenciais.
                                      window.location.reload();
                                    } else {
                                      window.location.reload();
                                    }
                                  }
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-brand-purple/20 hover:bg-brand-purple/30 border border-brand-purple/30 rounded-xl transition-all text-brand-purple hover:text-white text-xs font-bold uppercase"
                              title="Acessar conta deste usuário (Impersonation)"
                            >
                              <LogIn size={14} />
                              Entrar
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`Tem certeza que deseja deletar ${user.fullName}? Esta ação não pode ser desfeita.`)) {
                                  onDeleteUser(user.id);
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all text-red-400 hover:text-red-300 text-xs font-bold uppercase"
                            >
                              <Trash2 size={14} />
                              Deletar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}


                    {users.filter(u => u.role === 'user').length === 0 && (
                      <div className="py-20 text-center glass-card rounded-[2rem] border border-white/5">
                        <Users size={48} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum lead cadastrado ainda</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Aba de Dicas */}
            {activeTab === 'tips' && (
              <div className="space-y-6 animate-page-enter">
                <section className="glass-card rounded-[2.5rem] p-6 border border-white/10 space-y-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-purple/20 rounded-xl flex items-center justify-center">
                      <Sparkles size={18} className="text-brand-purple" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Nova Dica / Mensagem</h3>
                      <p className="text-[10px] text-slate-500 uppercase">Aparecerá na rolagem horizontal da Home</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Conteúdo da Dica</label>
                      <textarea
                        value={newTipContent}
                        onChange={e => setNewTipContent(e.target.value)}
                        placeholder="Escreva uma dica curta e impactante..."
                        className="w-full h-24 bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-brand-purple/50 resize-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Autor</label>
                      <input
                        type="text"
                        value={newTipAuthor}
                        onChange={e => setNewTipAuthor(e.target.value)}
                        placeholder="Ex: Mentor Master"
                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 px-4 text-sm outline-none"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (!newTipContent) return;
                        onAddTip({
                          id: `tip_${Date.now()}`,
                          content: newTipContent,
                          author: newTipAuthor,
                          timestamp: 'Agora'
                        });
                        setNewTipContent('');
                        alert("Dica publicada com sucesso!");
                      }}
                      className="w-full py-4 bg-brand-purple border-none rounded-2xl font-black uppercase shadow-glow-purple"
                    >
                      Publicar Dica
                    </Button>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Dicas Ativas</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {appTips.map(tip => (
                      <div key={tip.id} className="bg-slate-900 border border-white/5 rounded-2xl p-5 flex justify-between items-center group">
                        <div className="flex-1">
                          <p className="text-sm text-white italic">"{tip.content}"</p>
                          <p className="text-[10px] text-brand-purple font-bold mt-2 uppercase">{tip.author} • {tip.timestamp}</p>
                        </div>
                        <button onClick={() => onDeleteTip(tip.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Aba de Guias de Estudo */}
            {activeTab === 'guides' && (
              <div className="space-y-6 animate-page-enter">
                <section className="glass-card rounded-[2.5rem] p-6 border border-white/10 space-y-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-purple/20 rounded-xl flex items-center justify-center">
                      <BookOpen size={18} className="text-brand-purple" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Novo Guia de Estudo</h3>
                      <p className="text-[10px] text-slate-500 uppercase">Roteiro hierárquico por disciplina</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Disciplina</label>
                      <select
                        value={newGuideDiscipline}
                        onChange={e => setNewGuideDiscipline(e.target.value)}
                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 px-4 text-sm outline-none"
                      >
                        <option value="">Selecione uma Disciplina</option>
                        {['Matemática', 'Língua Portuguesa', 'Didáctica da Matemática', 'Didáctica da Língua Portuguesa'].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Estrutura do Guia (JSON)</label>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(GUIDE_JSON_EXAMPLE);
                            alert("Estrutura copiada!");
                          }}
                          className="text-[10px] font-black text-brand-purple uppercase hover:underline flex items-center gap-1"
                        >
                          <Copy size={12} /> Copiar Estrutura
                        </button>
                      </div>
                      <textarea
                        value={guideJsonContent}
                        onChange={e => setGuideJsonContent(e.target.value)}
                        placeholder='[ { "id": "t1", "title": "Tema 1", "subthemes": ["..."] } ]'
                        className="w-full h-64 bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-white font-mono text-xs outline-none focus:ring-2 focus:ring-brand-purple/50 resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      {editingGuideId && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingGuideId(null);
                            setNewGuideDiscipline('');
                            setGuideJsonContent('');
                          }}
                          className="flex-1 py-4 bg-slate-800 text-white border-none rounded-2xl font-black uppercase"
                        >
                          Cancelar
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          if (!newGuideDiscipline || !guideJsonContent) {
                            alert("Selecione a disciplina e preencha o JSON.");
                            return;
                          }
                          try {
                            const topics = JSON.parse(guideJsonContent);
                            if (!Array.isArray(topics)) throw new Error("Deve ser um array.");

                            if (editingGuideId) {
                              onUpdateStudyGuide({
                                id: editingGuideId,
                                discipline: newGuideDiscipline,
                                topics: topics
                              });
                              alert("Guia de Estudo atualizado!");
                            } else {
                              onAddStudyGuide({
                                id: `guide_${Date.now()}`,
                                discipline: newGuideDiscipline,
                                topics: topics
                              });
                              alert("Guia de Estudo publicado!");
                            }
                            setEditingGuideId(null);
                            setNewGuideDiscipline('');
                            setGuideJsonContent('');
                          } catch (e) {
                            alert("Erro no JSON: " + (e as Error).message);
                          }
                        }}
                        className="flex-[2] py-4 bg-brand-purple border-none rounded-2xl font-black uppercase shadow-glow-purple"
                      >
                        {editingGuideId ? 'Salvar Alterações' : 'Publicar Guia Completo'}
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Guias Publicados</h3>
                  <div className="space-y-4">
                    {Array.isArray(studyGuides) && studyGuides.length > 0 ? (
                      studyGuides.map(guide => {
                        if (!guide || typeof guide !== 'object') return null;
                        const guideId = guide.id || Math.random().toString();
                        return (
                          <div key={guideId} className="bg-slate-900 border border-white/5 rounded-[2rem] p-6 group">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-black text-white uppercase tracking-tight">
                                {typeof guide.discipline === 'string' ? guide.discipline : 'Disciplina Indefinida'}
                              </h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (!guide) return;
                                    setEditingGuideId(guide.id);
                                    setNewGuideDiscipline(guide.discipline || '');
                                    setGuideJsonContent(JSON.stringify(guide.topics || [], null, 2));
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="p-2 text-slate-500 hover:text-brand-purple transition-colors"
                                >
                                  <Edit3 size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (guide?.id && window.confirm("Deletar este guia?")) {
                                      onDeleteStudyGuide(guide.id);
                                    }
                                  }}
                                  className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2 border-l border-brand-purple/30 pl-4 ml-2">
                              {Array.isArray(guide.topics) && guide.topics.length > 0 ? (
                                guide.topics.map((t, idx) => {
                                  if (!t || typeof t !== 'object') return null;
                                  return (
                                    <div key={t.id || idx} className="text-xs text-slate-400">
                                      <span className="text-brand-purple font-bold mr-2">Tema {idx + 1}:</span> {t.title || 'Sem título'}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-slate-500 italic">Nenhum tópico definido neste guia</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center bg-slate-900 border border-white/5 rounded-[2rem]">
                        <BookOpen size={40} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-slate-500 text-sm">Nenhum guia de estudo publicado ainda</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Aba de Treinamento (Banco de Questões Aleatórias) */}
            {activeTab === 'training' && (
              <div className="space-y-6 animate-page-enter">
                <section className="glass-card rounded-[2.5rem] p-8 border border-white/10 bg-brand-purple/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><Target size={100} /></div>
                  <h2 className="text-xl font-bold mb-2">Banco de Questões (Treinar)</h2>
                  <p className="text-xs text-slate-400 max-w-xs mb-8">Estas questões alimentarão o modo "Simulado Aleatório" dos alunos. Elas nunca se repetem até que o banco seja esgotado.</p>

                  <div className="flex flex-col gap-4">
                    <Button
                      className="py-4 px-8 rounded-2xl bg-brand-purple border-none shadow-glow-purple font-black text-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                      onClick={() => {
                        setEditingQuestion({
                          id: `q_train_${Date.now()}`,
                          discipline: '',

                          text: '',
                          options: ['', '', '', '', ''],
                          correctIndex: 0,
                          explanation: '',
                          difficulty: Difficulty.Medium,
                          type: 'mcq',
                          tags: ['Treino']
                        });
                      }}
                    >
                      <Plus size={18} /> ADICIONAR QUESTÃO AO BANCO
                    </Button>

                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-3">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsImportingQuestions(!isImportingQuestions)}>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <Upload size={14} className="text-brand-purple" /> Importação em Massa (JSON)
                        </h4>
                        <ChevronRight size={14} className={`text-slate-500 transition-transform ${isImportingQuestions ? 'rotate-90' : ''}`} />
                      </div>

                      {isImportingQuestions && (
                        <div className="space-y-3 animate-fade-in pt-2">
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={importJsonContent}
                              onChange={e => setImportJsonContent(e.target.value)}
                              placeholder='[ { "text": "Pergunta...", "options": ["A", "B"], "correctIndex": 0, "explanation": "..." } ]'
                              className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-brand-purple/50"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(TRAINING_QUESTIONS_EXAMPLE);
                                  alert('✅ Exemplo JSON copiado para o banco de treino!');
                                }}
                                className="flex-1 py-2 bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple text-[10px] font-bold uppercase rounded-xl border border-brand-purple/30 transition-all flex items-center justify-center gap-2"
                              >
                                <Copy size={12} /> Copiar Exemplo JSON
                              </button>
                              <Button
                                onClick={handleImportQuestions}
                                disabled={!importJsonContent.trim()}
                                className="flex-[2] py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase rounded-xl border border-white/5"
                              >
                                Processar Importação
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Questões no Banco ({trainingQuestions.length})</h3>
                  <div className="space-y-4">
                    {trainingQuestions.map((q, idx) => (
                      <div key={q.id} className="bg-slate-900 border border-white/5 rounded-[2rem] p-6 group transition-all hover:border-brand-purple/50">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-brand-purple/20 text-brand-purple">
                              <Target size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] text-brand-purple font-black uppercase">Questão {idx + 1}</p>
                              <p className="text-xs text-white font-bold">{q.discipline}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingQuestion(q)}
                              className="p-2 text-slate-500 hover:text-white transition-colors"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button
                              onClick={() => onDeleteTrainingQuestion(q.id)}
                              className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-300 line-clamp-2 italic">"{q.text}"</p>
                      </div>
                    ))}
                    {trainingQuestions.length === 0 && (
                      <div className="py-20 text-center glass-card rounded-[2rem] border border-white/5">
                        <Target size={48} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhuma questão no banco de treino</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Aba de Materiais */}
            {activeTab === 'materials' && (
              <div className="space-y-6 animate-page-enter">
                <section className="glass-card rounded-[2.5rem] p-6 border border-white/10 space-y-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Folder size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{editingMaterial ? 'Editar Material' : 'Novo Material'}</h3>
                      <p className="text-[10px] text-slate-500 uppercase">PDFs, Apostilas e Materiais Complementares</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Título do Material</label>
                      <input
                        type="text"
                        value={newMaterialTitle}
                        onChange={e => setNewMaterialTitle(e.target.value)}
                        placeholder="Ex: Apostila de Direito Administrativo"
                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 px-4 text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2">URL da Foto de Capa</label>
                      <input
                        type="text"
                        value={newMaterialCoverUrl}
                        onChange={e => setNewMaterialCoverUrl(e.target.value)}
                        placeholder="https://exemplo.com/foto.jpg"
                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 px-4 text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Link para Download</label>
                      <input
                        type="text"
                        value={newMaterialDownloadUrl}
                        onChange={e => setNewMaterialDownloadUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 px-4 text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Descrição Breve (Opcional)</label>
                      <textarea
                        value={newMaterialDescription}
                        onChange={e => setNewMaterialDescription(e.target.value)}
                        placeholder="Descreva brevemente o que contém este material..."
                        className="w-full h-24 bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 resize-none text-sm"
                      />
                    </div>
                  </div>

                  {/* VIP Toggle */}
                  <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <input
                      type="checkbox"
                      id="material-vip-toggle"
                      checked={newMaterialIsVip}
                      onChange={(e) => setNewMaterialIsVip(e.target.checked)}
                      className="w-5 h-5 rounded bg-slate-800 border-amber-500/50 text-amber-500 focus:ring-2 focus:ring-amber-500/50"
                    />
                    <label htmlFor="material-vip-toggle" className="flex items-center gap-2 cursor-pointer">
                      <Trophy size={18} className="text-amber-500" />
                      <div>
                        <p className="text-sm font-bold text-amber-500">Marcar como VIP</p>
                        <p className="text-[10px] text-slate-400">Apenas usuários VIP poderão acessar</p>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveMaterial}
                      className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 border-none rounded-2xl font-black uppercase shadow-lg"
                    >
                      {editingMaterial ? 'Salvar Alterações' : 'Adicionar Material'}
                    </Button>
                    {editingMaterial && (
                      <Button
                        onClick={() => {
                          setEditingMaterial(null);
                          setNewMaterialTitle('');
                          setNewMaterialCoverUrl('');
                          setNewMaterialDescription('');
                          setNewMaterialDownloadUrl('');
                        }}
                        className="px-6 py-4 bg-slate-800 border-none rounded-2xl font-black uppercase"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Materiais Disponíveis</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {materials.map(mat => (
                      <div key={mat.id} className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden group transition-all hover:border-blue-500/30">
                        {mat.coverUrl && (
                          <div className="h-32 w-full overflow-hidden relative">
                            <img src={mat.coverUrl} alt={mat.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60" />
                          </div>
                        )}
                        <div className="p-5 space-y-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-white text-sm line-clamp-1">{mat.title}</h4>
                              {mat.isVip && <Trophy size={14} className="text-amber-500" title="Material VIP" />}
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">{mat.date}</p>
                          </div>
                          {mat.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {mat.description}
                            </p>
                          )}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => {
                                setEditingMaterial(mat);
                                setNewMaterialTitle(mat.title);
                                setNewMaterialCoverUrl(mat.coverUrl);
                                setNewMaterialDescription(mat.description || '');
                                setNewMaterialDownloadUrl(mat.downloadUrl);
                                setNewMaterialIsVip(mat.isVip || false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase transition-all"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm("Deletar este material?")) {
                                  onDeleteMaterial(mat.id);
                                }
                              }}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {materials.length === 0 && (
                      <div className="sm:col-span-2 py-20 text-center glass-card rounded-[2rem] border border-white/5">
                        <Folder size={48} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum material cadastrado</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}


            {/* Outras abas (simplificadas para foco no Simulado Pro) */}
            {activeTab === 'summaries' && (
              <div className="space-y-6 animate-page-enter">
                <section className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-brand-purple/20 rounded-2xl text-brand-purple">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">Gestão de Resumos</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Destaques e Pontos-Chave</p>
                    </div>
                  </div>

                  <form id="summary-admin-form" className="space-y-6" onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const id = formData.get('summaryId') as string;
                    const summaryData: AdminSummary = {
                      id: id || `sum_${Date.now()}`,
                      title: formData.get('title') as string,
                      category: formData.get('category') as string,
                      content: formData.get('content') as string,
                      imageUrl: formData.get('imageUrl') as string,
                      date: new Date().toLocaleDateString('pt-BR'),
                      isNew: !id,
                      isVip: formData.get('isVip') === 'true'
                    };

                    if (id) {
                      onUpdateSummary(summaryData);
                    } else {
                      onAddSummary(summaryData);
                    }
                    e.currentTarget.reset();
                    (e.currentTarget.elements.namedItem('summaryId') as HTMLInputElement).value = '';
                  }}>
                    <input type="hidden" name="summaryId" />
                    <input type="hidden" name="isVip" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título do Resumo</label>
                        <input name="title" required placeholder="Ex: Princípios da Administração Pública" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria / Matéria</label>
                        <input name="category" required placeholder="Ex: Direito Administrativo" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL da Imagem (Opcional)</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600"><ImageIcon size={18} /></div>
                        <input name="imageUrl" placeholder="https://exemplo.com/imagem.jpg" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <textarea name="content" required rows={6} placeholder="Escreva aqui os pontos mais importantes..." className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all resize-none" value={summaryContent} onChange={(e) => setSummaryContent(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preview do Conteúdo (LaTeX)</label>
                      <div className="w-full bg-black/20 border border-white/5 rounded-2xl p-6 text-white text-sm min-h-[100px]">
                        <LatexRenderer content={summaryContent} />
                      </div>
                    </div>

                    {/* VIP Toggle */}
                    <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                      <input
                        type="checkbox"
                        id="summary-vip-toggle"
                        className="w-5 h-5 rounded bg-slate-800 border-amber-500/50 text-amber-500 focus:ring-2 focus:ring-amber-500/50"
                        onChange={(e) => {
                          const form = document.getElementById('summary-admin-form') as HTMLFormElement;
                          if (form) {
                            (form.elements.namedItem('isVip') as HTMLInputElement).value = e.target.checked ? 'true' : 'false';
                          }
                        }}
                      />
                      <label htmlFor="summary-vip-toggle" className="flex items-center gap-2 cursor-pointer">
                        <Trophy size={18} className="text-amber-500" />
                        <div>
                          <p className="text-sm font-bold text-amber-500">Marcar como VIP</p>
                          <p className="text-[10px] text-slate-400">Apenas usuários VIP poderão acessar</p>
                        </div>
                      </label>
                    </div>

                    <div className="flex gap-4">
                      <Button type="submit" className="flex-1 bg-brand-purple hover:bg-brand-purple-dark text-white py-4 rounded-2xl font-black shadow-glow-purple flex items-center justify-center gap-2">
                        <Save size={20} /> SALVAR RESUMO
                      </Button>
                      <Button type="reset" variant="secondary" className="px-8 bg-slate-800 text-slate-400 border-white/5 rounded-2xl font-black" onClick={(e) => {
                        const form = e.currentTarget.closest('form');
                        if (form) (form.elements.namedItem('summaryId') as HTMLInputElement).value = '';
                      }}>
                        LIMPAR
                      </Button>
                    </div>
                  </form>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4 flex items-center gap-2">
                    <ListChecks size={14} /> Resumos Publicados ({summaries.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {summaries.map(summary => (
                      <div key={summary.id} className="bg-slate-900 border border-white/5 rounded-[2rem] p-6 flex flex-col md:flex-row gap-6 group transition-all hover:border-brand-purple/30">
                        {summary.imageUrl && (
                          <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                            <img src={summary.imageUrl} alt={summary.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded uppercase tracking-wider">{summary.category}</span>
                              {summary.isVip && <Trophy size={14} className="text-amber-500" title="Conteúdo VIP" />}
                            </div>
                            <span className="text-[9px] text-slate-600 font-bold">{summary.date}</span>
                          </div>
                          <h4 className="font-black text-white mb-2 truncate">{summary.title}</h4>
                          <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                            <LatexRenderer content={summary.content} previewMode={true} />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const form = document.getElementById('summary-admin-form') as HTMLFormElement;
                                if (form) {
                                  (form.elements.namedItem('summaryId') as HTMLInputElement).value = summary.id;
                                  (form.elements.namedItem('title') as HTMLInputElement).value = summary.title;
                                  (form.elements.namedItem('category') as HTMLInputElement).value = summary.category;
                                  (form.elements.namedItem('content') as HTMLTextAreaElement).value = summary.content;
                                  setSummaryContent(summary.content);
                                  (form.elements.namedItem('imageUrl') as HTMLInputElement).value = summary.imageUrl || '';
                                  (form.elements.namedItem('isVip') as HTMLInputElement).value = summary.isVip ? 'true' : 'false';
                                  (document.getElementById('summary-vip-toggle') as HTMLInputElement).checked = summary.isVip || false;
                                  form.scrollIntoView({ behavior: 'smooth' });
                                }
                              }}
                              className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                              <Edit3 size={14} /> Editar
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Tem certeza que deseja excluir este resumo?')) {
                                  onDeleteSummary(summary.id);
                                }
                              }}
                              className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2.5 rounded-xl transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="space-y-6 animate-page-enter">
                <section className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-brand-purple/20 rounded-2xl text-brand-purple">
                      <Database size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">Gestão de Matérias</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Base de Conhecimento Teórica</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                      <h4 className="text-sm font-bold text-white mb-4">Adicionar Novo Tópico / Aula</h4>
                      <form className="space-y-4" onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newNode: TopicNode = {
                          id: `${nodeType === 'folder' ? 'fol' : 'top'}_${Date.now()}`,
                          title: formData.get('title') as string,
                          type: nodeType,
                          content: nodeType === 'file' ? topicContent : undefined,
                          children: nodeType === 'folder' ? [] : undefined,
                          isNew: true,
                          isVip: topicIsVip
                        };
                        onAddTopic(selectedParentId, newNode);
                        e.currentTarget.reset();
                        setTopicContent('');
                        setTopicIsVip(false);
                        alert(`${nodeType === 'folder' ? 'Pasta' : 'Tópico'} adicionado com sucesso!`);
                      }}>
                        <div className="flex p-1 bg-black/20 rounded-xl mb-6">
                          <button
                            type="button"
                            onClick={() => setNodeType('file')}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${nodeType === 'file' ? 'bg-brand-purple text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            <FileText size={14} /> Aula / Tópico
                          </button>
                          <button
                            type="button"
                            onClick={() => setNodeType('folder')}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${nodeType === 'folder' ? 'bg-brand-purple text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            <Folder size={14} /> Nova Pasta
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                              {nodeType === 'folder' ? 'Nome da Pasta' : 'Título da Aula'}
                            </label>
                            <input name="title" required placeholder={nodeType === 'folder' ? "Ex: Geometria Analítica" : "Ex: Aula 01 - Introdução"} className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 px-4 text-white outline-none" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Pasta Destino</label>
                            <select
                              value={selectedParentId}
                              onChange={(e) => setSelectedParentId(e.target.value)}
                              className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 px-4 text-white outline-none appearance-none"
                            >
                              <option value="root">Raiz (Disciplinas)</option>
                              {(() => {
                                const renderFolderOptions = (node: TopicNode, depth = 0): React.ReactNode[] => {
                                  let options: React.ReactNode[] = [];
                                  if (node.id !== 'root' && node.type === 'folder') {
                                    options.push(
                                      <option key={node.id} value={node.id}>
                                        {'\u00A0'.repeat(depth * 2)}{node.title}
                                      </option>
                                    );
                                  }
                                  if (node.children) {
                                    node.children.filter(c => c.type === 'folder').forEach(child => {
                                      options = [...options, ...renderFolderOptions(child, depth + (node.id === 'root' ? 0 : 1))];
                                    });
                                  }
                                  return options;
                                };
                                return renderFolderOptions(topicTree);
                              })()}
                            </select>
                          </div>
                        </div>
                        {nodeType === 'file' && (
                          <>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Conteúdo Teórico (LaTeX)</label>
                              <textarea
                                name="content"
                                required
                                rows={8}
                                placeholder="Insira o conteúdo completo usando comandos LaTeX..."
                                className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 px-4 text-white outline-none resize-none"
                                value={topicContent}
                                onChange={(e) => setTopicContent(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preview do Conteúdo (LaTeX)</label>
                              <div className="w-full bg-black/20 border border-white/5 rounded-2xl p-6 text-white text-sm min-h-[100px]">
                                <LatexRenderer content={topicContent} />
                              </div>
                            </div>
                          </>
                        )}

                        {/* VIP Toggle */}
                        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                          <input
                            type="checkbox"
                            id="topic-vip-toggle"
                            checked={topicIsVip}
                            onChange={(e) => setTopicIsVip(e.target.checked)}
                            className="w-5 h-5 rounded bg-slate-800 border-amber-500/50 text-amber-500 focus:ring-2 focus:ring-amber-500/50"
                          />
                          <label htmlFor="topic-vip-toggle" className="flex items-center gap-2 cursor-pointer">
                            <Trophy size={18} className="text-amber-500" />
                            <div>
                              <p className="text-sm font-bold text-amber-500">Marcar como VIP</p>
                              <p className="text-[10px] text-slate-400">Apenas usuários VIP poderão acessar</p>
                            </div>
                          </label>
                        </div>

                        <Button type="submit" className="w-full bg-brand-purple text-white py-3 rounded-xl font-bold uppercase text-xs">
                          {nodeType === 'folder' ? 'Criar Pasta' : 'Adicionar à Árvore de Matérias'}
                        </Button>
                      </form>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Estrutura Atual</h4>
                      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 max-h-96 overflow-y-auto">
                        {(() => {
                          const renderNode = (node: TopicNode, depth = 0) => (
                            <div key={node.id} className="space-y-1">
                              <div className={`flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-all group ${depth === 0 ? 'bg-white/5 border border-white/5' : ''}`}>
                                <div style={{ marginLeft: `${depth * 1.5}rem` }} className="flex items-center gap-3 flex-1">
                                  {node.type === 'folder' ? (
                                    <Folder size={16} className={depth === 0 ? "text-brand-purple" : "text-slate-500"} />
                                  ) : (
                                    <FileText size={16} className="text-blue-400" />
                                  )}
                                  <span className={`text-xs ${depth === 0 ? 'font-bold text-white' : 'text-slate-300'}`}>{node.title}</span>
                                  {node.isNew && <span className="text-[8px] bg-brand-green/20 text-brand-green px-1.5 py-0.5 rounded uppercase font-bold">Novo</span>}
                                  {node.isVip && <Trophy size={12} className="text-amber-500" title="Conteúdo VIP" />}
                                </div>
                                {node.id !== 'root' && (
                                  <button
                                    onClick={() => {
                                      const typeLabel = node.type === 'folder' ? 'esta pasta e todo o seu conteúdo' : 'este tópico';
                                      if (confirm(`Tem certeza que deseja excluir ${typeLabel}? Esta ação não pode ser desfeita.`)) {
                                        onDeleteTopic(node.id);
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 p-1 hover:bg-red-500/10 rounded transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                              {node.children && node.children.map(child => renderNode(child, depth + 1))}
                            </div>
                          );
                          return renderNode(topicTree);
                        })()}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </main>
        </>
      ) : (
        <main className="flex-1 p-6 pb-32 overflow-y-auto no-scrollbar">
          {renderSimuladoEditor()}
        </main>
      )}

      {!isCreatingSimulado && (
        <footer className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#0F172A] to-transparent pointer-events-none z-50">
          <div className="md:max-w-md md:mx-auto pointer-events-auto">
            <Button variant="secondary" className="w-full bg-slate-900/80 backdrop-blur-xl text-slate-400 py-4 rounded-[2rem] border border-white/10" onClick={onBack}>FECHAR ADMINISTRAÇÃO</Button>
          </div>
        </footer>
      )}

      {/* Modal de Edição de Questão Manual - TELA INTEIRA */}
      {editingQuestion && (
        <div className="fixed inset-0 z-[9999] bg-[#0F172A] flex flex-col animate-fade-in overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-slate-400"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Plus size={18} className="text-brand-purple" /> <span className="break-words">Editor de Questão</span>
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Criação Manual</p>
              </div>
            </div>
            <Button
              onClick={saveEditingQuestion}
              disabled={!editingQuestion.text || (editingQuestion.options || []).filter(o => o.trim()).length < 2}
              className="px-6 py-3 bg-brand-green border-none rounded-2xl font-black uppercase shadow-glow text-sm disabled:opacity-50"
            >
              <Save size={16} className="mr-2" /> Salvar Questão
            </Button>
          </header>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Enunciado da Questão */}
            <section className="glass-card rounded-[2rem] p-6 border border-white/10 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <FileText size={18} className="text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Enunciado</h4>
                  <p className="text-[10px] text-slate-500 uppercase">Texto da questão</p>
                </div>
              </div>
              <textarea
                value={editingQuestion.text}
                onChange={e => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                placeholder="Digite o enunciado completo da questão aqui..."
                className="w-full h-40 bg-slate-800/50 border border-white/5 rounded-2xl p-5 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-brand-purple/50 resize-none text-base leading-relaxed"
                autoFocus
              />
              <div className="mt-4 p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Preview (LaTeX)</p>
                <div className="text-white text-sm leading-relaxed">
                  <LatexRenderer content={editingQuestion.text || ''} />
                </div>
              </div>
            </section>

            {/* Alternativas */}
            <section className="glass-card rounded-[2rem] p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-purple/20 rounded-xl flex items-center justify-center">
                    <ListChecks size={18} className="text-brand-purple" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Alternativas</h4>
                    <p className="text-[10px] text-slate-500 uppercase">Clique na letra para marcar a correta</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const currentOptions = editingQuestion.options || [];
                    if (currentOptions.length < 10) {
                      setEditingQuestion({ ...editingQuestion, options: [...currentOptions, ''] });
                    }
                  }}
                  disabled={(editingQuestion.options || []).length >= 10}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-purple/20 text-brand-purple rounded-xl text-xs font-bold uppercase hover:bg-brand-purple/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>

              <div className="space-y-3">
                {(editingQuestion.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    {/* Botão de Alternativa (clique para marcar correta) */}
                    <button
                      onClick={() => setEditingQuestion({ ...editingQuestion, correctIndex: i })}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-all shrink-0 ${editingQuestion.correctIndex === i
                        ? 'bg-brand-green text-white shadow-glow ring-2 ring-brand-green/50'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                        }`}
                      title={editingQuestion.correctIndex === i ? 'Resposta correta' : 'Clique para marcar como correta'}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>

                    {/* Campo de Texto */}
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const newOpts = [...(editingQuestion.options || [])];
                        newOpts[i] = e.target.value;
                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                      }}
                      className="flex-1 bg-slate-800/50 border border-white/5 rounded-xl px-5 py-4 text-white text-sm outline-none focus:ring-2 focus:ring-brand-purple/50 transition-all"
                      placeholder={`Digite o texto da alternativa ${String.fromCharCode(65 + i)}...`}
                    />
                    <div className="w-1/3 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-white text-xs">
                      <LatexRenderer content={opt} />
                    </div>

                    {/* Indicador de Correta */}
                    {editingQuestion.correctIndex === i && (
                      <div className="px-3 py-1 bg-brand-green/20 text-brand-green text-[10px] font-black uppercase rounded-lg shrink-0">
                        Correta
                      </div>
                    )}

                    {/* Botão Remover */}
                    {(editingQuestion.options || []).length > 2 && (
                      <button
                        onClick={() => {
                          const newOpts = (editingQuestion.options || []).filter((_, idx) => idx !== i);
                          let newCorrectIndex = editingQuestion.correctIndex || 0;
                          if (i < newCorrectIndex) newCorrectIndex--;
                          else if (i === newCorrectIndex) newCorrectIndex = 0;
                          setEditingQuestion({ ...editingQuestion, options: newOpts, correctIndex: Math.min(newCorrectIndex, newOpts.length - 1) });
                        }}
                        className="p-3 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        title="Remover alternativa"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-2">
                <AlertCircle size={14} />
                Mínimo 2 alternativas, máximo 10. A alternativa marcada em <span className="text-brand-green font-bold">verde</span> é a correta.
              </p>
            </section>

            {/* Explicação */}
            <section className="glass-card rounded-[2rem] p-6 border border-white/10 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <Sparkles size={18} className="text-yellow-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Explicação</h4>
                  <p className="text-[10px] text-slate-500 uppercase">Por que a resposta é correta?</p>
                </div>
              </div>
              <textarea
                value={editingQuestion.explanation}
                onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                placeholder="Explique por que a alternativa selecionada é a correta. Isso ajuda os alunos a aprenderem..."
                className="w-full h-32 bg-slate-800/50 border border-white/5 rounded-2xl p-5 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none text-sm leading-relaxed"
              />
              <div className="mt-4 p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Preview (LaTeX)</p>
                <div className="text-white text-sm leading-relaxed">
                  <LatexRenderer content={editingQuestion.explanation || ''} />
                </div>
              </div>
            </section>

            {/* Metadados */}
            <section className="glass-card rounded-[2rem] p-6 border border-white/10 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-500/20 rounded-xl flex items-center justify-center">
                  <Settings size={18} className="text-slate-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Configurações</h4>
                  <p className="text-[10px] text-slate-500 uppercase">Detalhes da questão</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Disciplina</label>
                  <input
                    type="text"
                    value={editingQuestion.discipline}
                    onChange={e => setEditingQuestion({ ...editingQuestion, discipline: e.target.value })}
                    placeholder="Ex: Português"
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 outline-none text-sm"
                  />
                </div>

              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Dificuldade</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={e => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as Difficulty })}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 outline-none text-sm"
                  >
                    <option value={Difficulty.Easy}>Fácil</option>
                    <option value={Difficulty.Medium}>Médio</option>
                    <option value={Difficulty.Hard}>Difícil</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    value={(editingQuestion.tags || []).join(', ')}
                    onChange={e => setEditingQuestion({ ...editingQuestion, tags: e.target.value.split(',').map(t => t.trim()) })}
                    placeholder="Ex: Crase, Sintaxe"
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 outline-none text-sm"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="p-6 bg-slate-900/80 border-t border-white/10 backdrop-blur-xl">
            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={() => setEditingQuestion(null)}
                className="flex-1 py-4 bg-slate-800 text-white border-none rounded-2xl font-black uppercase"
              >
                Cancelar
              </Button>
              <Button
                onClick={saveEditingQuestion}
                disabled={!editingQuestion.text || (editingQuestion.options || []).filter(o => o.trim()).length < 2}
                className="px-8 py-3 bg-brand-purple border-none rounded-2xl font-black uppercase shadow-glow-purple disabled:opacity-50"
              >
                Salvar e Adicionar
              </Button>
            </div>
          </footer>
        </div>
      )}

      {/* Modal de Importação JSON para Simulado */}
      {isImportingToSimulado && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0F172A] rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-blue-500/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Upload size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Importar Questões JSON</h3>
                  <p className="text-xs text-blue-400 font-bold uppercase">Adicione múltiplas questões ao simulado</p>
                </div>
              </div>
              <button
                onClick={() => { setIsImportingToSimulado(false); setSimuladoImportJson(''); }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4">
                <p className="text-sm text-blue-300 leading-relaxed">
                  Cole o JSON com as questões abaixo. O formato deve ser um array de objetos com os campos: <code className="bg-black/30 px-1 rounded">text</code>, <code className="bg-black/30 px-1 rounded">options</code>, <code className="bg-black/30 px-1 rounded">correctIndex</code>, <code className="bg-black/30 px-1 rounded">explanation</code>.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-400 uppercase">Cole o JSON aqui:</label>
                </div>
                <textarea
                  value={simuladoImportJson}
                  onChange={(e) => setSimuladoImportJson(e.target.value)}
                  placeholder='[{"text": "Pergunta...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]'
                  className="w-full h-64 bg-slate-900 border border-white/10 rounded-2xl p-4 text-white font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </div>

              <div className="text-xs text-slate-500">
                <p className="mb-1">💡 <strong>Dica:</strong> As questões herdarão automaticamente:</p>
                <ul className="list-disc list-inside ml-3 space-y-1">
                  <li>Disciplina: <span className="text-brand-purple font-bold">{currentPreset.area || 'Geral'}</span></li>
                  <li>Dificuldade: <span className="text-brand-purple font-bold">{currentPreset.level || 'Médio'}</span></li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-slate-900/50 flex gap-4">
              <Button
                variant="secondary"
                onClick={() => { setIsImportingToSimulado(false); setSimuladoImportJson(''); }}
                className="flex-1 py-3 bg-slate-800 text-white border-none rounded-2xl font-black uppercase"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImportToSimulado}
                disabled={!simuladoImportJson.trim()}
                className="flex-[2] py-3 bg-blue-500 hover:bg-blue-600 border-none rounded-2xl font-black uppercase shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={18} className="mr-2" />
                Importar Questões
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
