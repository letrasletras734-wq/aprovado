
export enum Difficulty {
  Easy = 'Fácil',
  Medium = 'Médio',
  Hard = 'Difícil'
}

export type QuestionType = 'mcq' | 'tf' | 'short' | 'essay';
export type SimuladoMode = 'random' | 'challenge' | 'exam';

export interface Question {
  id: string;
  discipline: string;
  text: string;
  options: string[];
  correctIndex: number; // Para MCQ e TF
  correctAnswer?: string; // Para Short/Essay
  explanation: string;
  difficulty: Difficulty;
  type: QuestionType;
  tags: string[];
  points?: number;
}

export interface SimuladoConfig {
  mode: SimuladoMode;
  disciplines?: string[];
  questionCount?: number;
  difficulty?: Difficulty | 'Mixed';
  presetId?: string;
}

// Tipos de Desafios
export type ChallengeSubType = 'progressive' | 'timed' | 'endurance' | 'reading';

export type ProgressiveLevel = 'Fácil' | 'Moderado' | 'Médio' | 'Médio Moderado' | 'Difícil' | 'Super Difícil';

export interface SimuladoPreset {
  id: string;
  title: string;
  description: string;
  type: 'challenge' | 'exam' | 'official' | 'diagnostic';
  challengeSubType?: ChallengeSubType; // Subtipo do desafio
  level: Difficulty | ProgressiveLevel;
  institution?: string;
  year?: number;
  area: string;
  timeLimit?: number; // em minutos
  totalPoints?: number;
  questionCount: number;
  questions: Question[];
  status: 'draft' | 'published';
  scheduledDays?: string[]; // ['Segunda', 'Terça', ...]
  order?: number; // Ordem sequencial para provas oficiais (1, 2, 3...)
  isProgressiveWithLevels?: boolean;
  progressiveLevels?: {
    level: ProgressiveLevel;
    questions: Question[];
  }[];
  readingContent?: string; // Content for reading challenges
  isVip?: boolean;
  minimumSuccessRate?: number; // Taxa mínima de acerto para considerar sucesso (padrão: 50%)
}

export interface SimuladoSession {
  id: string;
  mode: SimuladoMode;
  questions: Question[];
  answers: Record<string, number | string>;
  startTime: number;
  endTime?: number;
  isFinished: boolean;
  presetId?: string;
  isProgressive?: boolean;
  currentLevel?: string;
  timeLimit?: number; // em minutos
  accumulatedQuestions?: Question[];
  accumulatedAnswers?: Record<string, number | string>;
  readingContent?: string;
  challengeSubType?: ChallengeSubType;
}


export type ContentType = 'summary' | 'image' | 'pdf';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  tag: string;
}

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
}

export interface TopicNode {
  id: string;
  title: string;
  type: 'folder' | 'file';
  children?: TopicNode[];
  content?: string;
  summary?: string;
  isNew?: boolean;
  isSummary?: boolean;
  isVip?: boolean;
}

export interface AdminSummary {
  id: string;
  title: string;
  category: string;
  content: string;
  date: string;
  isNew?: boolean;
  imageUrl?: string;
  isVip?: boolean;
}

export interface DisciplineStats {
  [topic: string]: { correct: number, total: number };
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  fullName: string;
  gender: 'male' | 'female';
  avatarUrl: string;
  role: UserRole;
}

export interface OnboardingData {
  difficulties: string;
  expectations: string;
  timestamp: string;
  email?: string; // New field for admin panel
  raw_password?: string; // New field for admin panel
}

export interface UserAccount {
  id: string;
  name: string;
  fullName: string;
  email: string;
  password?: string;
  avatarUrl: string;
  role: UserRole;
  isNewMember: boolean;
  onboardingCompleted: boolean;
  onboardingData?: OnboardingData;
  score: number;
  accuracy: number;
  questionsSolved: number;
  examPoints?: number;
  isVip?: boolean;
}

export interface ExamHistoryEntry {
  presetId: string;
  presetTitle: string;
  score: number;         // Pontos obtidos (max 20)
  correct: number;       // Questões corretas
  total: number;         // Total de questões
  percentage: number;    // Taxa de acerto
  completedAt: string;   // Data ISO
}

export interface UserStats {
  score: number;
  lastUpdate: number;
  totalQuestions: number;
  accuracy: number;
  rank: number;
  streak: number;
  weaknesses: string[];
  completedPresets: string[];
  successfulPresets: string[]; // Desafios completados com sucesso (50%+ de acertos)
  progressiveLevelsReached: { [presetId: string]: string }; // Nível atingido em desafios progressivos
  favoriteSummaries: string[];
  readSummaries: string[];
  favoriteTopics: string[];
  readTopics: string[];
  seenTrainingQuestions: string[];
  detailedStats: {
    [discipline: string]: DisciplineStats;
  };
  examPoints: number; // Pontos acumulados apenas de provas oficiais (para níveis)
  examHistory?: ExamHistoryEntry[]; // Histórico de provas oficiais realizadas
}

export interface RankingUser {
  id: string;
  name: string;
  score: number;
  questionsSolved: number;
  accuracy: number;
  avatarUrl: string;
  lastUpdate: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert' | 'question_report';
  targetUserId?: string;
  questionData?: {
    questionId: string;
    questionText: string;
    discipline: string;
    reportedBy: string;
    reportedAt: string;
    presetTitle?: string;
  };
}

export interface AppTip {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

export interface StudyGuide {
  id: string;
  discipline: string;
  topics: {
    id: string;
    title: string;
    description?: string;
    subthemes?: string[];
  }[];
}

export interface AdminMaterial {
  id: string;
  title: string;
  coverUrl: string;
  description?: string;
  downloadUrl: string;
  date: string;
  isVip?: boolean;
}

export interface OfficialExam {
  id: string;
  title: string;
  content: string; // LaTeX content
  timeLimit: number; // minutes
  isVip: boolean;
  active: boolean;
  createdAt: string;
}

export interface ExamAccessRecord {
  id: string;
  userId: string;
  examId: string;
  userName: string; // Nome digitado no formulário
  userAccountName?: string; // Nome original da conta
  userPhone: string;
  userEmail?: string; // Email do usuário
  userAvatar?: string; // Avatar do usuário
  userPoints?: number; // Pontos do usuário no momento do acesso
  userIsVip?: boolean; // Status VIP no momento do acesso
  accessedAt: string;
  status: 'started' | 'finished' | 'not_finished';
  finishedAt?: string; // Timestamp de quando o usuário marcou como finalizado
}
