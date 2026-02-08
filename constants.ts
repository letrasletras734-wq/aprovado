
import { Difficulty, NewsItem, Question, UserStats, RankingUser, ContentItem, Notification, SimuladoPreset, TopicNode, AdminSummary, User } from './types';

// Motivational phrases logic remains
export const MOTIVATIONAL_PHRASES = {
  female: [
    "Pronta para garantir a sua vaga?",
    "Tudo pronto para conquistar a sua vaga?",
    "Já preparada para assegurar a sua vaga?",
    "Hora de dar o próximo passo rumo à sua vaga!",
    "A sua vaga começa agora. Vamos?"
  ],
  male: [
    "Painel de controle pronto, Comandante.",
    "Hora de guiar os alunos rumo à aprovação!",
    "O ecossistema está sob sua supervisão.",
    "Lidere com excelência, o sucesso deles é o seu.",
    "Sua visão estratégica define o futuro do app."
  ]
};

const BASE_TIME = Date.now() - 86400000;

export const MOCK_USER_STATS: UserStats = {
  score: 0,
  lastUpdate: Date.now(),
  totalQuestions: 0,
  accuracy: 0,
  rank: 0,
  streak: 0,
  weaknesses: [],
  completedPresets: [],
  successfulPresets: [],
  progressiveLevelsReached: {},
  favoriteSummaries: [],
  readSummaries: [],
  favoriteTopics: [],
  readTopics: [],
  seenTrainingQuestions: [],
  detailedStats: {},
  examPoints: 0
};

export const MOCK_RANKING: RankingUser[] = [];

export const AVATAR_OPTIONS = {
  male: [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo'
  ],
  female: [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sasha'
  ]
};

export const MOCK_NEWS: NewsItem[] = [];


export const MOCK_ADMIN_SUMMARIES: AdminSummary[] = [];

export const MOCK_TOPIC_TREE: TopicNode = {
  id: 'root',
  title: 'Disciplinas',
  type: 'folder',
  children: []
};

// Fix: Added required 'type' property to Question object
export const MOCK_QUESTIONS: Question[] = [];

// Fix: Added required properties 'level', 'area', 'questions', and 'status' to SimuladoPreset object
export const MOCK_PRESETS: SimuladoPreset[] = [];
export const DISCIPLINES_LIST = ['Matemática', 'Língua Portuguesa', 'Didáctica da Matemática', 'Didáctica da Língua Portuguesa', 'Geral'];
export const MOCK_NOTIFICATIONS: Notification[] = [];

export const LATEX_PROMPT_GUIDE = `Você é um engenheiro sênior especializado em renderização de LaTeX para web. O aplicativo usa renderização cliente via KaTeX, que processa conteúdo matemático e alguns comandos de texto.

REGRAS OBRIGATÓRIAS PARA GERAÇÃO DE CONTEÚDO:

1. Delimitadores Matemáticos:
   - Use \\[ ... \\] para equações em destaque (display mode).
   - Use $ ... $ para equações inline.
   - Todo comando LaTeX complexo deve estar dentro de um desses modos.

2. Tabelas e Arrays:
   - NÃO use o ambiente \\begin{table}. Use apenas o conteúdo.
   - Converta \\begin{tabular} para \\begin{array} se o conteúdo for puramente matemático.
   - Para tabelas didáticas, use \\begin{tabular} (o app converterá para HTML premium).
   - Exemplo de Array Matemático:
     \\[ \\begin{array}{|l|c|c|} \\hline \\textbf{Item} & \\textbf{Qtd} & \\textbf{Unid} \\\\ \\hline Arroz & 5 & kg \\\\ \\hline \\end{array} \\]

3. Legendas e Títulos:
   - NÃO use \\caption{}. Use texto normal em negrito: **Legenda: texto**.
   - Use \\section*{Título} para cabeçalhos de seção.

4. Cores e Destaques:
   - Declare cores: \\definecolor{azul}{rgb}{0,0.2,0.6}.
   - Use \\textcolor{cor}{texto} para destacar palavras.
   - Notas importantes: \\textcolor{vermelho}{Nota: texto}.

5. Estrutura de Documento:
   - NÃO inclua \\documentclass, \\usepackage ou \\begin{document}. 
   - Foque apenas no conteúdo do corpo do texto.

Gere o conteúdo seguindo estas diretrizes para garantir que nada apareça como texto bruto (comandos visíveis).`;

// Sistema de Níveis (baseado em pontos de provas oficiais)
export const LEVELS = [
  {
    id: 1,
    name: 'Iniciante',
    minPoints: 0,
    maxPoints: 199,
    color: '#CD7F32', // Bronze
    icon: '🥉',
    description: 'Início da jornada no aplicativo'
  },
  {
    id: 2,
    name: 'Aprendiz',
    minPoints: 200,
    maxPoints: 499,
    color: '#C0C0C0', // Prata clara
    icon: '🥈',
    description: 'Primeiros progressos consolidados'
  },
  {
    id: 3,
    name: 'Dedicado',
    minPoints: 500,
    maxPoints: 999,
    color: '#FFD700', // Ouro rosé
    icon: '🏅',
    description: 'Consistência e disciplina nos estudos'
  },
  {
    id: 4,
    name: 'Avançado',
    minPoints: 1000,
    maxPoints: 2999,
    color: '#FFD700', // Ouro clássico
    icon: '🥇',
    description: 'Domínio progressivo dos conteúdos'
  },
  {
    id: 5,
    name: 'Excelência',
    minPoints: 3000,
    maxPoints: 4999,
    color: '#E5E4E2', // Platina
    icon: '🏆',
    description: 'Alto desempenho acadêmico'
  },
  {
    id: 6,
    name: 'Avançado Excelente',
    minPoints: 5000,
    maxPoints: Infinity,
    color: '#B9F2FF', // Platina premium
    icon: '👑',
    description: 'Excelência máxima e preparação de elite'
  }
];

export const getUserLevel = (points: number) => {
  return LEVELS.find(level => points >= level.minPoints && points <= level.maxPoints) || LEVELS[0];
};

export const getNextLevel = (currentPoints: number) => {
  const currentLevel = getUserLevel(currentPoints);
  const nextLevelIndex = LEVELS.findIndex(l => l.id === currentLevel.id) + 1;
  return nextLevelIndex < LEVELS.length ? LEVELS[nextLevelIndex] : null;
};

export const getLevelProgress = (points: number) => {
  const currentLevel = getUserLevel(points);
  const nextLevel = getNextLevel(points);

  if (!nextLevel) {
    return { percentage: 100, pointsToNext: 0, currentLevelPoints: points - currentLevel.minPoints };
  }

  const currentLevelPoints = points - currentLevel.minPoints;
  const totalPointsNeeded = nextLevel.minPoints - currentLevel.minPoints;
  const percentage = Math.round((currentLevelPoints / totalPointsNeeded) * 100);
  const pointsToNext = nextLevel.minPoints - points;

  return { percentage, pointsToNext, currentLevelPoints };
};
