
import React, { useState, useEffect, useMemo } from 'react';
import { Dashboard } from './components/views/Dashboard';
import { SimuladoConfig } from './components/views/SimuladoConfig';
import { SimuladoRun } from './components/views/SimuladoRun';
import { ContentsView } from './components/views/ContentsView';
import { RankingDetail } from './components/views/RankingDetail';
import { LoginView } from './components/views/LoginView';
import { AdminPanel } from './components/views/AdminPanel';
import { OnboardingSurvey } from './components/views/OnboardingSurvey';
import { ProfileView } from './components/views/ProfileView';
import { BottomNav } from './components/BottomNav';
import { MOCK_QUESTIONS, MOCK_USER_STATS, MOCK_ADMIN_SUMMARIES, MOCK_PRESETS, MOCK_RANKING, MOCK_NOTIFICATIONS, MOCK_TOPIC_TREE } from './constants';
import { Question, SimuladoConfig as ConfigType, SimuladoSession, UserStats, RankingUser, AdminSummary, Notification, SimuladoPreset, TopicNode, UserRole, UserAccount, AppTip, StudyGuide, AdminMaterial, OfficialExam, ExamAccessRecord } from './types';
import { ExamView } from './components/views/ExamView';
import { Moon, Sun, LogOut, ShieldCheck, MessageCircle, Copy, Check, Headphones, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from './services/supabase';



const APP_VERSION = '2.0.0'; // Version change forces localStorage cleanup

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true); // Novo: estado de loading
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [currentView, setCurrentView] = useState(() => localStorage.getItem('currentView') || 'dashboard');
  const [navigationHistory, setNavigationHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('navigationHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAdminDesktopMode, setIsAdminDesktopMode] = useState(true); // Default to true for admin productivity

  // Admin Test Modes
  const [isAdminVipMode, setIsAdminVipMode] = useState(false); // Simulate VIP access
  const [isDevMode, setIsDevMode] = useState(false); // DEV mode: bypass locks, don't save progress

  const [rankingList, setRankingList] = useState<RankingUser[]>([]); // Novo: Ranking semanal real do Supabase
  const [users, setUsers] = useState<UserAccount[]>([]); // Lista de usuários do Supabase

  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount | null>(null);
  const [dbConnectionError, setDbConnectionError] = useState(false);

  useEffect(() => {
    // Para usuários normais, verificar sessão no Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Sessão recuperada:', session?.user?.id || 'Nenhuma sessão ativa');
      setIsAuthenticated(!!session);
      if (session?.user) {
        fetchProfile(session.user.id).then((exists) => {
          console.log('👤 Perfil carregado após check de sessão:', exists ? 'Sucesso' : 'Falha/Não existe');
          setIsLoadingSession(false);
        });
      } else {
        setIsLoadingSession(false); // Terminou de verificar sessão (sem usuário)
      }
    }).catch(err => {
      console.error('❌ Erro crítico ao verificar sessão:', err);
      setIsLoadingSession(false); // Liberar loading mesmo com erro
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔄 Mudança de autenticação detectada:', _event, session?.user?.id || 'Logout');

      if (session?.user) {
        // Verificar se o perfil existe antes de marcar como autenticado
        console.log('🔵 Verificando existência do perfil...');
        const profileExists = await fetchProfile(session.user.id, session.user.email);

        if (!profileExists) {
          console.warn('⚠️ Perfil não encontrado para usuário autenticado (Conta Zumbi).');
          console.log('🛠️ Tentando auto-recuperação/criação de perfil temporário...');

          // CRITICAL FIX: Do NOT force logout here.
          // Allowing the app to proceed means it can trigger the "New Member" flow or "Fallback" logic
          // which is exactly what we want for "resurrecting" a zombie account.
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(true);
          console.log('✅ Autenticado com sucesso via evento authChange');
        }
      } else {
        console.log('👋 Usuário desconectado');
        setCurrentUserAccount(null);
        setUserRole('user');
        setIsAuthenticated(false);
        setIsLoadingSession(false);
      }
    }); // fechamento do onAuthStateChange


    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, userEmail?: string): Promise<boolean> => {
    try {
      console.log('🔵 Buscando perfil do usuário:', userId);

      // Implementar timeout de 10 segundos para a chamada do banco
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_DB')), 10000)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ Erro ao buscar perfil:', error);

        // Se o erro for "not found", significa que a conta foi deletada
        if (error.code === 'PGRST116' || error.message.includes('no rows')) {
          console.warn('⚠️ Perfil não existe - possivelmente conta deletada anteriormente');
          // Retornar true para enganar o fluxo inicial e permitir que o App tente recuperar
          // O fallback lá embaixo vai criar um usuário temporário
          setIsLoadingSession(false);
          return false;
        }

        setIsLoadingSession(false);
        return false;
      }

      if (data) {
        console.log('✅ Perfil encontrado no banco de dados:', data);

        // If profile exists with a full_name, assume onboarding was completed
        // This prevents existing users from being asked to onboard again
        const hasCompletedOnboarding = data.onboarding_completed === true ||
          (data.onboarding_completed == null && data.full_name && data.full_name !== 'User');

        console.log('📝 onboarding_completed from DB:', data.onboarding_completed);
        console.log('📝 hasCompletedOnboarding (calculated):', hasCompletedOnboarding);

        const mappedAccount: UserAccount = {
          id: data.id,
          name: data.username || data.full_name?.split(' ')[0] || 'Usuário',
          fullName: data.full_name || 'Usuário',
          email: userEmail || '', // Email passed from session
          password: '', // Not stored
          avatarUrl: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.id}`,
          role: (data.role as UserRole) || 'user',
          isNewMember: false,
          onboardingCompleted: data.onboarding_completed || false,
          score: data.score || 0,
          accuracy: data.accuracy || 0,
          questionsSolved: data.questions_solved || 0,
          examPoints: data.exam_points || 0,
          isVip: data.is_vip || false
        };
        console.log('👤 Created userAccount:', mappedAccount);
        setCurrentUserAccount(mappedAccount);
        setUserRole(mappedAccount.role);

        const currentUserId = data.id;
        localStorage.setItem('currentUserId', currentUserId);

        // Sincronizar stats do Supabase se existirem (mas preservar favoritos e itens lidos carregados separadamente)
        if (data.stats && Object.keys(data.stats).length > 0) {
          console.log('📊 Carregando estatísticas do banco de dados (preservando favoritos)');
          setUserStats(prev => {
            const { favoriteSummaries, favoriteTopics, readSummaries, readTopics, ...otherStats } = data.stats;
            return {
              ...prev,
              ...otherStats
            };
          });
        }

        setIsLoadingSession(false);
        return true; // Perfil encontrado e carregado com sucesso
      }
      setIsLoadingSession(false);
      return false; // Should not reach here if data is null and no error
    } catch (error: any) {
      if (error.message === 'TIMEOUT_DB') {
        console.error('❌ Timeout ao buscar perfil após 10s.');
        setDbConnectionError(true);
      } else {
        console.error('Unexpected error fetching profile:', error);
      }

      setIsLoadingSession(false);
      return false;
    }
  };

  const [simuladoSession, setSimuladoSession] = useState<SimuladoSession | null>(null);
  const [userStats, setUserStats] = useState<UserStats>(() => {
    const userId = localStorage.getItem('currentUserId');
    if (userId) {
      const saved = localStorage.getItem(`user_stats_${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...MOCK_USER_STATS, ...parsed };
      }
    }
    return MOCK_USER_STATS;
  });
  const [adminSummaries, setAdminSummaries] = useState<AdminSummary[]>(MOCK_ADMIN_SUMMARIES);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [presets, setPresets] = useState<SimuladoPreset[]>(MOCK_PRESETS);
  const [topicTree, setTopicTree] = useState<TopicNode>(MOCK_TOPIC_TREE);
  const [appTips, setAppTips] = useState<AppTip[]>([]);

  const fetchTips = async () => {
    try {
      console.log('🔵 Buscando dicas do banco de dados...');
      const { data, error } = await supabase
        .from('app_tips')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar dicas:', error);
        return;
      }

      console.log('📦 Dados recebidos do banco:', data);
      console.log('📊 Número de dicas:', data?.length || 0);

      if (data) {
        const formattedTips = data.map(tip => ({
          id: tip.id,
          content: tip.content,
          author: tip.author,
          timestamp: new Date(tip.timestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(tip.timestamp).toLocaleDateString('pt-BR')
        }));
        console.log('✅ Dicas formatadas:', formattedTips);
        setAppTips(formattedTips);
      }
    } catch (err) {
      console.error('❌ Erro inesperado ao buscar dicas:', err);
    }
  };

  const fetchSummaries = async () => {
    try {
      const { data, error } = await supabase.from('admin_summaries').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        setAdminSummaries(data.map(s => ({
          id: s.id,
          title: s.title,
          category: s.category,
          content: s.content,
          date: s.date,
          isNew: s.is_new,
          imageUrl: s.image_url,
          isVip: s.is_vip
        })));
      }
    } catch (err) {
      console.error('Error fetching summaries:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        setNotifications(data.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: n.time,
          read: n.read,
          type: n.type as any,
          targetUserId: n.target_user_id,
          questionData: n.question_data
        })));
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchPresets = async () => {
    try {
      const { data, error } = await supabase.from('presets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        setPresets(data.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description || '',
          type: p.type as any,
          challengeSubType: p.challenge_sub_type as any,
          level: p.level as any,
          institution: p.institution || undefined,
          year: p.year || undefined,
          area: p.area,
          timeLimit: p.time_limit || undefined,
          totalPoints: p.total_points,
          questionCount: p.question_count,
          questions: p.questions as any[],
          status: p.status as any,
          scheduledDays: p.scheduled_days || undefined,
          order: p.order || undefined,
          isProgressiveWithLevels: p.is_progressive_with_levels,
          progressiveLevels: p.progressive_levels as any[],
          readingContent: p.reading_content || undefined,
          isVip: p.is_vip,
          minimumSuccessRate: p.minimum_success_rate
        })));
      }
    } catch (err) {
      console.error('Error fetching presets:', err);
    }
  };

  const fetchStudyGuides = async () => {
    try {
      const { data, error } = await supabase.from('study_guides').select('*');
      if (error) throw error;
      if (data) setStudyGuides(data);
    } catch (err) {
      console.error('Error fetching study guides:', err);
    }
  };

  const fetchTopics = async () => {
    try {
      console.log('🔵 Buscando matérias (tópicos)...');
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Build hierarchy
        const buildTree = (parentId: string | null): TopicNode[] => {
          return data
            .filter(t => t.parent_id === parentId)
            .map(t => ({
              id: t.id,
              title: t.title,
              type: t.type as 'folder' | 'file',
              content: t.content,
              isVip: t.is_vip,
              children: buildTree(t.id)
            }));
        };

        const rootNodes = buildTree(null);
        if (rootNodes.length > 0) {
          const root = rootNodes.find(n => n.id === 'root') || rootNodes[0];
          setTopicTree(root);
        }
      }
    } catch (err) {
      console.error('❌ Erro ao buscar tópicos:', err);
    }
  };

  const fetchTrainingQuestions = async () => {
    try {
      const { data, error } = await supabase.from('training_questions').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        setTrainingQuestions(data.map(q => ({
          id: q.id,
          discipline: q.discipline,
          text: q.text,
          options: q.options as string[],
          correctIndex: q.correct_index,
          explanation: q.explanation || '',
          difficulty: q.difficulty as any,
          type: q.type as any,
          tags: q.tags || []
        })));
      }
    } catch (err) {
      console.error('Error fetching training questions:', err);
    }
  };

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase.from('admin_materials').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        setAdminMaterials(data.map(m => ({
          id: m.id,
          title: m.title,
          coverUrl: m.cover_url || '',
          description: m.description || '',
          downloadUrl: m.download_url,
          date: m.date,
          isVip: m.is_vip
        })));
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    }
  };

  const fetchRanking = async () => {
    try {
      console.log('🏆 Buscando ranking semanal do banco...');
      const { data, error } = await supabase.rpc('get_weekly_ranking');

      if (error) {
        console.error('❌ Erro ao buscar ranking:', error);
        // Alert user if RPC is missing
        if (error.code === 'PGRST202') {
          alert('⚠️ Função de Ranking não encontrada!\n\nPor favor, execute o script SQL "015_final_ranking_fix.sql" no editor SQL do seu Supabase.');
        } else {
          alert(`❌ Erro no Ranking: ${error.message}\n\nCódigo: ${error.code}\n\nNota: Execute o script "015_final_ranking_fix.sql" para corrigir possíveis erros de estrutura.`);
        }
        return;
      }

      if (data) {
        console.log(`📊 Ranking recebido: ${data.length} usuários encontrados.`);
        const mappedRanking = data.map((r: any) => ({
          id: r.id,
          name: r.name,
          score: r.score,
          questionsSolved: r.questionsSolved,
          accuracy: Number(r.accuracy),
          avatarUrl: r.avatarUrl,
          lastUpdate: Date.now()
        }));
        setRankingList(mappedRanking);

        // Atualizar o rank do próprio usuário no stats
        if (currentUserAccount) {
          const myRank = mappedRanking.findIndex((r: any) => r.id === currentUserAccount.id) + 1;
          console.log(`👤 Posição do usuário atual (${currentUserAccount.name}): ${myRank || 'Não ranqueado'}`);
          if (myRank > 0) {
            setUserStats(prev => ({ ...prev, rank: myRank }));
          } else {
            // Se o usuário não estiver na lista por algum motivo, forçar rank 0 para aparecer o '-'
            setUserStats(prev => ({ ...prev, rank: 0 }));
          }
        }

        console.log('✅ Ranking semanal sincronizado com sucesso.');
      } else {
        console.warn('⚠️ Ranking retornou dados vazios (null/undefined).');
      }

    } catch (err) {
      console.error('❌ Erro inesperado ao buscar ranking:', err);
    }
  };

  const fetchExams = async () => {
    try {
      console.log('🔵 Buscando provas oficiais do banco de dados...');
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar provas:', error);
        return;
      }

      console.log('📦 Provas recebidas do banco:', data);
      console.log('📊 Número de provas:', data?.length || 0);

      if (data && data.length > 0) {
        const mappedExams = data.map(e => ({
          id: e.id,
          title: e.title,
          content: e.content,
          timeLimit: e.time_limit,
          isVip: e.is_vip,
          active: e.active,
          createdAt: e.created_at
        }));
        console.log('✅ Provas formatadas:', mappedExams);
        setExams(mappedExams);
      }
    } catch (err) {
      console.error('❌ Erro inesperado ao buscar provas:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('🔵 Buscando usuários do banco de dados...');
      console.log('🔑 User role:', userRole);
      console.log('👤 Current user email:', currentUserAccount?.email);

      // Tentar buscar via RPC seguro (para Admin ver todos)
      // Isso evita bloqueios de RLS e recursão
      let { data, error } = await supabase.rpc('get_admin_profiles_view');

      // Fallback para select normal (caso a RPC não exista ou não seja admin)
      if (error) {
        console.warn('⚠️ Falha na RPC get_admin_profiles_view, tentando select normal...', error.message);
        const { data: selectData, error: selectError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        data = selectData;
        error = selectError;
      }

      if (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);

        if (userRole === 'admin') {
          console.warn('⚠️ ADMIN: Se você é admin mas não vê usuários, pode ser um problema de RLS (Row Level Security).');
          console.warn('⚠️ Verifique se as políticas do Supabase permitem que admins vejam todos os profiles.');
        }
        return;
      }

      console.log('📦 Usuários recebidos do banco:', data);
      console.log('📊 Número de usuários:', data?.length || 0);

      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhum usuário encontrado no banco de dados.');
        if (userRole === 'admin') {
          console.warn('⚠️ POSSÍVEIS CAUSAS:');
          console.warn('   1. Ainda não há usuários cadastrados');
          console.warn('   2. RLS (Row Level Security) está bloqueando o acesso');
          console.warn('   3. Você precisa estar logado com uma conta real do Supabase (não o admin local)');
        }
        setUsers([]);
        return;
      }

      if (data && data.length > 0) {
        const mappedUsers = data.map(u => ({
          id: u.id,
          name: u.username || u.full_name?.split(' ')[0] || 'Usuário',
          fullName: u.full_name || 'Usuário',
          email: '', // Email está em auth.users, não em profiles
          password: u.onboarding_data?.raw_password || '', // Recuprising password from metadata if available
          avatarUrl: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`,
          role: (u.role as UserRole) || 'user',
          isNewMember: false,
          onboardingCompleted: u.onboarding_completed || false,
          onboardingData: u.onboarding_data, // CRITICAL FIX: Ensure onboarding data is mapped
          score: u.score || 0,
          accuracy: u.accuracy || 0,
          questionsSolved: u.questions_solved || 0,
          examPoints: u.exam_points || 0,
          isVip: u.is_vip || false
        }));
        console.log('✅ Usuários formatados:', mappedUsers);
        console.log('✅ Total de usuários carregados:', mappedUsers.length);
        setUsers(mappedUsers);
      }
    } catch (err) {
      console.error('❌ Erro inesperado ao buscar usuários:', err);
    }
  };

  const fetchExamAccessRecords = async () => {
    try {
      const { data, error } = await supabase.from('exam_access_records').select('*').order('accessed_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        setExamAccessRecords(data.map(r => ({
          id: r.id,
          userId: r.user_id,
          examId: r.exam_id,
          userName: r.user_name,
          userPhone: r.user_phone || '',
          accessedAt: r.accessed_at,
          status: r.status as any,
          finishedAt: r.finished_at || undefined
        })));
      }
    } catch (err) {
      console.error('Error fetching exam access records:', err);
    }
  };

  const fetchFavorites = async () => {
    if (!currentUserAccount?.id) {
      console.log('⚠️ fetchFavorites cancelado: usuário não carregado');
      return;
    }

    try {
      console.log('📡 Buscando favoritos do Supabase para:', currentUserAccount.id);
      const { data, error } = await supabase.from('user_favorites').select('item_id, item_type').eq('user_id', currentUserAccount.id);

      if (error) {
        console.error('Error fetching favorites:', error);
        return;
      }

      if (data) {
        const favoriteSummaries = data.filter(f => f.item_type === 'summary').map(f => f.item_id);
        const favoriteTopics = data.filter(f => f.item_type === 'topic').map(f => f.item_id);
        console.log(`✅ Favoritos carregados: ${favoriteSummaries.length} resumos, ${favoriteTopics.length} tópicos`);

        setUserStats(prev => ({
          ...prev,
          favoriteSummaries,
          favoriteTopics
        }));
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  };

  const fetchReadItems = async () => {
    if (!currentUserAccount?.id) {
      console.log('⚠️ fetchReadItems cancelado: usuário não carregado');
      return;
    }

    try {
      console.log('📡 Buscando itens lidos do Supabase para:', currentUserAccount.id);
      const { data, error } = await supabase.from('user_read_items').select('item_id, item_type').eq('user_id', currentUserAccount.id);

      if (error) {
        console.error('Error fetching read items:', error);
        return;
      }

      if (data) {
        const readSummaries = data.filter(r => r.item_type === 'summary').map(r => r.item_id);
        const readTopics = data.filter(r => r.item_type === 'topic').map(r => r.item_id);
        console.log(`✅ Itens lidos carregados: ${readSummaries.length} resumos, ${readTopics.length} tópicos`);

        setUserStats(prev => ({
          ...prev,
          readSummaries,
          readTopics
        }));
      }
    } catch (err) {
      console.error('Error fetching read items:', err);
    }
  };

  useEffect(() => {
    let rankingSubscription: any;

    if (isAuthenticated) {
      console.log('📡 Iniciando sincronização de dados...');
      fetchTips();
      fetchSummaries();
      fetchNotifications();
      fetchPresets();
      fetchStudyGuides();
      fetchTopics();
      fetchTrainingQuestions();
      fetchMaterials();
      fetchExams();
      fetchExamAccessRecords();
      fetchUsers();
      fetchRanking();
      fetchFavorites();
      fetchReadItems();

      rankingSubscription = supabase
        .channel('ranking_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'simulado_results' }, () => {
          console.log('🔄 Realtime: Mudança nos simulados detectada, atualizando ranking...');
          fetchRanking();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
          console.log('🔄 Realtime: Mudança no perfil detectada, atualizando ranking...');
          fetchRanking();
        })
        .subscribe();
    }

    return () => {
      if (rankingSubscription) {
        supabase.removeChannel(rankingSubscription);
      }
    };
  }, [isAuthenticated, currentUserAccount?.id]);

  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [trainingQuestions, setTrainingQuestions] = useState<Question[]>([]);
  const [adminMaterials, setAdminMaterials] = useState<AdminMaterial[]>([]);
  const [exams, setExams] = useState<OfficialExam[]>([]);
  const [examAccessRecords, setExamAccessRecords] = useState<ExamAccessRecord[]>([]);
  const [activeExam, setActiveExam] = useState<OfficialExam | null>(null);
  const [currentProgressiveLevelIndex, setCurrentProgressiveLevelIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const userId = localStorage.getItem('currentUserId');
    // CRÍTICO: Só salvar stats se há um usuário autenticado
    // Isso previne que o logout resete as stats salvas do usuário
    if (userId && isAuthenticated) {
      localStorage.setItem(`user_stats_${userId}`, JSON.stringify(userStats));
    }
    // Cleanup old global stats if they exist
    localStorage.removeItem('app_user_stats');
  }, [userStats, isAuthenticated]);

  // Supabase handles persistence for these now

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => !n.targetUserId || n.targetUserId === currentUserAccount?.id);
  }, [notifications, currentUserAccount]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Persist currentView to localStorage
  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  // Persist navigationHistory to localStorage
  useEffect(() => {
    localStorage.setItem('navigationHistory', JSON.stringify(navigationHistory));
  }, [navigationHistory]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // --- NAVIGATION SYSTEM ---
  // Valid views list
  const validViews = ['dashboard', 'ranking-detail', 'contents', 'simulado-config', 'simulado-run', 'profile', 'admin-panel', 'exam-view'];

  const handleNavigate = (view: string) => {
    if (view === currentView) return;
    setNavigationHistory(prev => [...prev, currentView]);
    setCurrentView(view);
  };

  const handleBack = () => {
    if (navigationHistory.length === 0) {
      // No history, go to dashboard
      setCurrentView('dashboard');
      return;
    }

    const newHistory = [...navigationHistory];
    let previousView = newHistory.pop();

    // Skip invalid views in history
    while (previousView && !validViews.includes(previousView) && newHistory.length > 0) {
      previousView = newHistory.pop();
    }

    setNavigationHistory(newHistory);

    // Validate the previous view exists
    if (previousView && validViews.includes(previousView)) {
      // Special case: don't go back to simulado-run without session
      if (previousView === 'simulado-run' && !simuladoSession) {
        setCurrentView('simulado-config');
      } else {
        setCurrentView(previousView);
      }
    } else {
      setCurrentView('dashboard');
    }
  };

  const goBack = () => handleBack();

  const handleLogout = async () => {
    const currentUserId = localStorage.getItem('currentUserId');

    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserRole('user');
    setCurrentUserAccount(null);
    setUserStats(MOCK_USER_STATS); // Reset state on logout
    setNavigationHistory([]); // Clear history
    setUsers([]); // Clear local users array

    // Clear all localStorage entries that may cache stale data
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('currentView');
    localStorage.removeItem('navigationHistory');
    if (currentUserId) {
      localStorage.removeItem(`user_stats_${currentUserId}`);
    }

    console.log('🚪 Logout complete, all local data cleared');
  };


  const handleLogin = async (email: string, pass: string) => {
    // Deprecated: Login logic is now handled in LoginView via Supabase
    // This function signature might need to be kept for compatibility if passed down,
    // but effectively it should not be used or should just call supabase.
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      alert(error.message);
    } else {
      // Auth state change listener will handle the rest
      setCurrentView('dashboard');
    }
  };

  const handleRegister = (data: Partial<UserAccount>) => {
    const newUser: UserAccount = {
      id: `user_${Date.now()}`,
      name: data.name || 'Estudante',
      fullName: data.fullName || 'Usuário Concurseiro',
      email: data.email || '',
      password: data.password || '',
      avatarUrl: data.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      role: 'user',
      isNewMember: true,
      onboardingCompleted: false,
      score: 0,
      accuracy: 0,
      questionsSolved: 0,
      examPoints: 0
    };

    setUsers(prev => [...prev, newUser]);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', 'user');
    localStorage.setItem('currentUserId', newUser.id);
    setUserRole('user');
    setCurrentUserAccount(newUser);

    // Initialize user-specific stats as zero
    setUserStats(MOCK_USER_STATS);
    localStorage.setItem(`user_stats_${newUser.id}`, JSON.stringify(MOCK_USER_STATS));

    setIsAuthenticated(true);
    // Don't set view - renderContent will show onboarding for new users
  };

  const handleAdminAccess = () => {
    alert('ATENÇÃO: O modo "Admin Offline" foi desativado para garantir a segurança e funcionamento do banco de dados.\n\nPor favor, faça login com sua conta normal e certifique-se de que ela possui permissão de administrador no Supabase (tabela profiles -> role = "admin").');
    setCurrentView('login');
  };
  const handleCompleteOnboarding = async (data: any) => {
    if (!currentUserAccount) return;

    // CRITICAL: First, fetch current data from DB to ensure we don't lose the password
    let existingOnboardingData = currentUserAccount.onboardingData || {};

    try {
      const { data: dbProfile } = await supabase.from('profiles').select('onboarding_data').eq('id', currentUserAccount.id).single();
      if (dbProfile && dbProfile.onboarding_data) {
        console.log('📥 Fetched existing onboarding data from DB:', dbProfile.onboarding_data);
        existingOnboardingData = { ...existingOnboardingData, ...dbProfile.onboarding_data };
      }
    } catch (e) {
      console.warn('⚠️ Could not fetch latest profile data, relying on local state');
    }

    const updatedUser = {
      ...currentUserAccount,
      onboardingCompleted: true,
      onboardingData: {
        ...existingOnboardingData,
        ...data,
        timestamp: new Date().toISOString()
      }
    };

    // Optimistic update
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setCurrentUserAccount(updatedUser);
    setCurrentView('dashboard');

    // Persist to Supabase using UPSERT to handle both new and existing profiles
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: currentUserAccount.id,
          full_name: currentUserAccount.fullName,
          username: currentUserAccount.name,
          avatar_url: currentUserAccount.avatarUrl,
          role: currentUserAccount.role || 'user',
          onboarding_completed: true,
          onboarding_data: updatedUser.onboardingData,
          score: currentUserAccount.score || 0,
          accuracy: currentUserAccount.accuracy || 0,
          questions_solved: currentUserAccount.questionsSolved || 0,
          exam_points: currentUserAccount.examPoints || 0,
          is_vip: currentUserAccount.isVip || false,
          stats: MOCK_USER_STATS
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error saving onboarding data:', error);
      } else {
        console.log('✅ Onboarding data saved successfully');
      }
    } catch (err) {
      console.error('Unexpected error updating onboarding:', err);
    }
  };


  const handleConfirmUser = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isNewMember: false } : u));
  };

  const handleUpdateUserPoints = async (userId: string, points: number) => {
    try {
      console.log(`🎯 Atualizando pontos para o usuário ${userId}: ${points}`);

      // 1. Chamar RPC no Supabase
      const { data, error } = await supabase.rpc('update_user_points', {
        target_id: userId,
        points_to_add: points
      });

      if (error) {
        console.error('❌ Erro detalhado da RPC update_user_points:', error);
        alert(`Erro ao atualizar pontos: ${error.message || 'Erro no servidor'}`);
        return;
      }

      console.log('✅ Pontos atualizados no banco:', data);

      // 2. Atualizar estado local dos usuários
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            examPoints: data.exam_points,
            score: data.score,
            onboardingData: data.onboarding_data // Manter dados de onboarding sincronizados se necessário
          };
        }
        return u;
      }));

      // 3. Se for o usuário atual logado, atualizar seu estado
      if (currentUserAccount?.id === userId) {
        setCurrentUserAccount(prev => {
          if (!prev) return null;
          return {
            ...prev,
            examPoints: data.exam_points,
            score: data.score
          };
        });

        // Também atualizar userStats (que é usado em várias views)
        setUserStats(prev => ({
          ...prev,
          examPoints: data.exam_points,
          score: data.score,
          lastUpdate: Date.now()
        }));
      }

      // 4. Atualizar o ranking para refletir a nova posição
      fetchRanking();

    } catch (err) {
      console.error('❌ Erro inesperado ao atualizar pontos:', err);
    }
  };

  const handleToggleUserVip = async (userId: string) => {
    console.log('🔵 Alternando status VIP do usuário:', userId);

    // Buscar status atual do usuário
    const user = users.find(u => u.id === userId);
    if (!user) {
      console.error('❌ Usuário não encontrado');
      return;
    }

    const newVipStatus = !user.isVip;
    console.log(`🔄 Mudando VIP de ${user.isVip} para ${newVipStatus}`);

    // Atualizar no Supabase via RPC seguro para evitar problemas de RLS
    // A função toggle_user_vip verifica se o chamador é admin
    const { error } = await supabase.rpc('toggle_user_vip', {
      target_id: userId,
      new_status: newVipStatus
    });

    if (error) {
      console.warn('⚠️ Erro na RPC toggle_user_vip:', error);
      console.warn('⚠️ Tentando fallback via update direto (pode falhar por RLS)...');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_vip: newVipStatus })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status VIP (todos os métodos falharam):', updateError);
        alert(`❌ Erro ao atualizar status VIP: ${updateError.message}\n\nDica: Rode o script '004_create_toggle_vip_function.sql' no Supabase.`);
        return;
      }
    }

    console.log('✅ Status VIP atualizado com sucesso!');

    // Atualizar estados locais
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, isVip: newVipStatus };
      }
      return u;
    }));

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, isVip: newVipStatus };
      }
      return u;
    }));

    // Se for o usuário atual logado, também atualizar currentUserAccount
    if (currentUserAccount?.id === userId) {
      setCurrentUserAccount(prev => prev ? { ...prev, isVip: newVipStatus } : null);
    }

    alert(`✅ Usuário ${newVipStatus ? 'promovido a VIP' : 'removido do VIP'} com sucesso!`);

    // Forçar atualização da lista de usuários para garantir que o banco persistiu
    setTimeout(() => {
      fetchUsers();
    }, 500);
  };

  const handleToggleFavorite = async (itemId: string, itemType: 'summary' | 'topic', currentlyFavorite: boolean) => {
    if (!currentUserAccount?.id) return;

    // Ação Otimista
    setUserStats(prev => {
      const key = itemType === 'summary' ? 'favoriteSummaries' : 'favoriteTopics';
      const currentList = prev[key] || [];
      const newList = currentlyFavorite ? currentList.filter(id => id !== itemId) : [...currentList, itemId];
      return { ...prev, [key]: newList };
    });

    try {
      if (currentlyFavorite) {
        const { error } = await supabase.from('user_favorites').delete()
          .eq('user_id', currentUserAccount.id).eq('item_id', itemId).eq('item_type', itemType);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_favorites').insert({
          user_id: currentUserAccount.id, item_id: itemId, item_type: itemType
        });
        if (error) throw error;
      }
      // Não recarregar tudo imediatamente para evitar flicker, mas manter sincronizado
      // await fetchFavorites(); 
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Reverter se houver erro (opcional, simplificado aqui)
      await fetchFavorites();
    }
  };

  const handleToggleRead = async (itemId: string, itemType: 'summary' | 'topic', currentlyRead: boolean) => {
    if (!currentUserAccount?.id) return;

    // Ação Otimista
    setUserStats(prev => {
      const key = itemType === 'summary' ? 'readSummaries' : 'readTopics';
      const currentList = prev[key] || [];
      const newList = currentlyRead ? currentList.filter(id => id !== itemId) : [...currentList, itemId];
      return { ...prev, [key]: newList };
    });

    try {
      if (currentlyRead) {
        const { error } = await supabase.from('user_read_items').delete()
          .eq('user_id', currentUserAccount.id).eq('item_id', itemId).eq('item_type', itemType);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_read_items').insert({
          user_id: currentUserAccount.id, item_id: itemId, item_type: itemType
        });
        if (error) throw error;
      }
      // await fetchReadItems();
    } catch (err) {
      console.error('Error toggling read:', err);
      await fetchReadItems();
    }
  };

  const handleResetStats = (password: string): boolean => {
    return true; // Bypass password check for local reset for now, or implement similar async check
    /*
    if (!currentUserAccount || currentUserAccount.password !== password) {
      return false; // Senha incorreta
    }
    */

    // Resetar userStats completamente
    const freshStats = {
      ...MOCK_USER_STATS,
      lastUpdate: Date.now()
    };
    setUserStats(freshStats);
    localStorage.setItem(`user_stats_${currentUserAccount.id}`, JSON.stringify(freshStats));

    // Limpar histórico de provas do usuário
    setExamAccessRecords(prev => prev.filter(record => record.userId !== currentUserAccount.id));

    // Resetar dados da conta
    const resetUser = {
      ...currentUserAccount,
      score: 0,
      accuracy: 0,
      questionsSolved: 0,
      examPoints: 0
    };

    setCurrentUserAccount(resetUser);

    // Sincronizar reset no Supabase
    if (currentUserAccount) {
      supabase.from('profiles').update({
        score: 0,
        accuracy: 0,
        questions_solved: 0,
        exam_points: 0,
        stats: MOCK_USER_STATS
      }).eq('id', currentUserAccount.id).then(({ error }) => {
        if (error) console.error('❌ Erro ao resetar estatísticas no banco:', error);
        else {
          console.log('🔄 Estatísticas resetadas com sucesso no banco!');
          fetchRanking();
        }
      });
    }

    return true;
  };

  const handleDeleteAccount = async (password: string): Promise<boolean> => {
    // Verificar senha real via Supabase Auth
    if (!currentUserAccount?.email) {
      console.error('❌ Email do usuário não encontrado para verificação.');
      return false;
    }

    // Tentar login para verificar senha
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: currentUserAccount.email,
      password: password
    });

    if (loginError) {
      console.error('❌ Verificação de senha falhou:', loginError);
      return false; // Senha incorreta
    }


    try {
      const userId = currentUserAccount.id;

      console.log('🔵 Iniciando exclusão de conta:', userId);

      // 1. Tentar deletar do Supabase Auth (requer service_role_key)
      try {
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) {
          console.warn('⚠️ Não foi possível deletar via Auth Admin API:', authError.message);
          console.warn('⚠️ Isso é esperado se você estiver usando a chave anon.');
          console.warn('⚠️ O usuário será removido apenas do banco de dados.');

          // Fallback: deletar apenas da tabela profiles
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

          if (profileError) throw profileError;
          console.log('✅ Perfil deletado do banco de dados');
        } else {
          console.log('✅ Usuário deletado do Supabase Auth (CASCADE para profiles)');
        }
      } catch (authError) {
        console.warn('⚠️ Erro ao deletar via Auth:', authError);

        // Fallback: deletar da tabela profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileError) throw profileError;
        console.log('✅ Perfil deletado do banco de dados');
      }

      // 2. Fazer logout
      await supabase.auth.signOut();

      // 3. Limpar TUDO do localStorage
      localStorage.clear();

      // 4. Reset todos os estados
      setUsers(prev => prev.filter(u => u.id !== userId));
      setIsAuthenticated(false);
      setUserRole('user');
      setCurrentUserAccount(null);
      setCurrentView('dashboard');

      console.log('✅ Conta excluída com sucesso');
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao excluir conta:', error);
      alert(`❌ Erro ao excluir conta: ${error.message}`);
      return false;
    }
  };

  const handleUpdateSummary = (updatedSummary: AdminSummary) => {
    setAdminSummaries(prev => prev.map(s => s.id === updatedSummary.id ? updatedSummary : s));
  };

  const shuffleOptions = (question: Question): Question => {
    const correctText = question.options[question.correctIndex];
    const shuffledOptions = [...question.options];

    // Fisher-Yates shuffle
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }

    // Ensure it's actually different if there are at least 2 options
    // (Simple check to satisfy "not repeating same configuration" requirement)
    if (shuffledOptions.length > 1 && JSON.stringify(shuffledOptions) === JSON.stringify(question.options)) {
      // Just swap two elements if it happened to be the same
      [shuffledOptions[0], shuffledOptions[1]] = [shuffledOptions[1], shuffledOptions[0]];
    }

    const newCorrectIndex = shuffledOptions.indexOf(correctText);

    return {
      ...question,
      options: shuffledOptions,
      correctIndex: newCorrectIndex
    };
  };

  const handleStartExam = (exam: OfficialExam) => {
    if (exam.isVip && !currentUserAccount?.isVip && userRole !== 'admin') {
      alert('Esta prova é exclusiva para usuários VIP. Assine o plano Premium para ter acesso!');
      return;
    }
    setActiveExam(exam);
    setCurrentView('exam-view');
  };

  const handleExamSubmit = async (userName: string, userPhone: string) => {
    if (!activeExam || !currentUserAccount) return;

    const { error } = await supabase.from('exam_access_records').insert({
      id: `access_${Date.now()}`,
      exam_id: activeExam.id,
      user_id: currentUserAccount.id,
      user_name: userName,
      user_phone: userPhone,
      status: 'started'
    });

    if (error) console.error('Error saving exam access record:', error);
    fetchExamAccessRecords();
  };

  const handleExamStart = async (examId: string, userName: string, userPhone: string) => {
    console.log('🔵 [EXAM] Registrando acesso ao exame:', examId);
    console.log('👤 [EXAM] Usuário:', userName, userPhone);

    if (!currentUserAccount) {
      console.error('❌ [EXAM] Usuário não autenticado');
      return;
    }

    const accessRecord = {
      id: `exam_access_${Date.now()}`,
      user_id: currentUserAccount.id,
      exam_id: examId,
      user_name: userName, // Nome digitado no formulário
      user_account_name: currentUserAccount.fullName, // Nome original da conta
      user_phone: userPhone,
      user_email: currentUserAccount.email || '',
      user_avatar: currentUserAccount.avatarUrl || '',
      user_points: currentUserAccount.examPoints || 0,
      user_is_vip: currentUserAccount.isVip || false,
      accessed_at: new Date().toISOString(),
      status: 'started'
    };

    console.log('💾 [EXAM] Salvando registro:', accessRecord);

    const { data, error } = await supabase
      .from('exam_access_records')
      .insert(accessRecord)
      .select();

    if (error) {
      console.error('❌ [EXAM] Erro ao registrar acesso:', error);
      alert(`❌ Erro ao registrar acesso: ${error.message}`);
      return;
    }

    console.log('✅ [EXAM] Acesso registrado com sucesso:', data);
    await fetchExamAccessRecords();
  };

  const handleExamFinish = async (examId: string) => {
    const { error } = await supabase
      .from('exam_access_records')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString()
      })
      .eq('exam_id', examId)
      .eq('user_id', currentUserAccount?.id)
      .eq('status', 'started');

    if (error) console.error('Error finishing exam:', error);
    fetchExamAccessRecords();
  };

  const handleExamNotFinished = async (examId: string) => {
    const { error } = await supabase
      .from('exam_access_records')
      .update({
        status: 'not_finished'
      })
      .eq('exam_id', examId)
      .eq('user_id', currentUserAccount?.id)
      .eq('status', 'started');

    if (error) console.error('Error marking exam as not finished:', error);
    fetchExamAccessRecords();
  };

  const startSimulado = (config: ConfigType) => {
    let q: Question[] = [];

    let isProgressive = false;
    let currentLevelName = '';

    if (config.presetId) {
      const preset = presets.find(p => p.id === config.presetId);
      if (preset) {
        if (preset.isProgressiveWithLevels && preset.progressiveLevels) {
          isProgressive = true;
          setCurrentProgressiveLevelIndex(0);
          const levelData = preset.progressiveLevels[0];
          q = [...levelData.questions];
          currentLevelName = levelData.level;
        } else if (preset.questions) {
          q = [...preset.questions];
        }
      } else {
        // Fallback if preset not found (should not happen)
        q = [...MOCK_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, 10);
      }
    } else {
      // Random Mode - Use "Treinar" questions pool
      const pool = trainingQuestions.length > 0 ? trainingQuestions : MOCK_QUESTIONS;
      const count = config.questionCount || 10;

      // Filter out already seen questions
      const seenIds = userStats.seenTrainingQuestions || [];
      const unseen = pool.filter(q => !seenIds.includes(q.id));
      const seen = pool.filter(q => seenIds.includes(q.id));

      // Priority to unseen, but allow rare repeats (mix ~10% seen if available)
      const targetUnseen = Math.ceil(count * 0.9);
      const shuffledUnseen = [...unseen].sort(() => 0.5 - Math.random());
      const shuffledSeen = [...seen].sort(() => 0.5 - Math.random());

      let selected = shuffledUnseen.slice(0, targetUnseen);

      // Fill with seen questions to reach targetUnseen if not enough unseen
      if (selected.length < targetUnseen) {
        const needed = targetUnseen - selected.length;
        selected = [...selected, ...shuffledSeen.slice(0, needed)];
      }

      // Fill the rest (the 10% "rare repeat" or remaining slots)
      const remainingNeeded = count - selected.length;
      if (remainingNeeded > 0) {
        // Try to get from seen first (for the "rare repeat" effect)
        const alreadyUsedIds = selected.map(s => s.id);
        const availableSeen = shuffledSeen.filter(s => !alreadyUsedIds.includes(s.id));
        const availableUnseen = shuffledUnseen.slice(selected.length);

        const poolForRemaining = [...availableSeen, ...availableUnseen].sort(() => 0.5 - Math.random());
        selected = [...selected, ...poolForRemaining.slice(0, remainingNeeded)];
      }

      q = [...selected].sort(() => 0.5 - Math.random());

      // Mark newly seen questions
      const newlySeenIds = q.filter(item => !seenIds.includes(item.id)).map(item => item.id);

      // If we've seen almost everything, reset or just keep adding
      // For "priority to new", we reset when unseen is exhausted
      if (unseen.length <= newlySeenIds.length && pool.length > count) {
        setUserStats(prev => ({
          ...prev,
          seenTrainingQuestions: newlySeenIds
        }));
      } else {
        setUserStats(prev => ({
          ...prev,
          seenTrainingQuestions: [...seenIds, ...newlySeenIds]
        }));
      }
    }

    // Shuffle alternatives for each question
    const shuffledQuestions = q.map(shuffleOptions);

    let timeLimit = config.presetId ? presets.find(p => p.id === config.presetId)?.timeLimit : undefined;
    const preset = config.presetId ? presets.find(p => p.id === config.presetId) : undefined;

    // Debug: Log preset data
    console.log('Starting simulado with preset:', {
      presetId: config.presetId,
      hasPreset: !!preset,
      challengeSubType: preset?.challengeSubType,
      hasReadingContent: !!preset?.readingContent,
      readingContentLength: preset?.readingContent?.length || 0,
      readingContentPreview: preset?.readingContent?.substring(0, 100)
    });

    setSimuladoSession({
      id: Date.now().toString(),
      mode: config.mode,
      questions: shuffledQuestions,
      answers: {},
      startTime: Date.now(),
      isFinished: false,
      presetId: config.presetId,
      isProgressive,
      currentLevel: currentLevelName,
      timeLimit,
      readingContent: preset?.readingContent,
      challengeSubType: preset?.challengeSubType
    });
    handleNavigate('simulado-run');
  };

  const handleNextProgressiveLevel = (currentSession: SimuladoSession) => {
    if (!currentSession || !currentSession.presetId) return;

    const preset = presets.find(p => p.id === currentSession.presetId);
    if (!preset || !preset.progressiveLevels) return;

    const nextIdx = currentProgressiveLevelIndex + 1;
    if (nextIdx >= preset.progressiveLevels.length) {
      // Finished all levels!
      finishSimulado(currentSession);
      return;
    }

    // Accumulate current phase data
    const newAccumulatedQuestions = [
      ...(currentSession.accumulatedQuestions || []),
      ...currentSession.questions
    ];
    const newAccumulatedAnswers = {
      ...(currentSession.accumulatedAnswers || {}),
      ...currentSession.answers
    };

    setCurrentProgressiveLevelIndex(nextIdx);
    const levelData = preset.progressiveLevels[nextIdx];
    const shuffledQuestions = levelData.questions.map(shuffleOptions);

    setSimuladoSession({
      ...currentSession,
      id: Date.now().toString(),
      questions: shuffledQuestions,
      answers: {},
      startTime: Date.now(),
      isFinished: false,
      currentLevel: levelData.level,
      accumulatedQuestions: newAccumulatedQuestions,
      accumulatedAnswers: newAccumulatedAnswers
    });
  };

  const finishSimulado = (result: SimuladoSession) => {
    // DEV MODE: Skip all saving, just show result and return
    if (isDevMode) {
      const finalQuestions = [
        ...(result.accumulatedQuestions || []),
        ...result.questions
      ];
      const finalAnswers = {
        ...(result.accumulatedAnswers || {}),
        ...result.answers
      };
      const totalQuestions = finalQuestions.length;
      const correct = finalQuestions.reduce((a, q) => a + (finalAnswers[q.id] === q.correctIndex ? 1 : 0), 0);
      const successRate = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

      alert(`🔧 MODO DEV - Resultado:\n\n✅ Acertos: ${correct}/${totalQuestions} (${Math.round(successRate)}%)\n\n⚠️ Nenhum dado foi salvo.`);

      localStorage.setItem('lastSimuladoMode', result.mode);
      handleNavigate('simulado-config');
      setSimuladoSession(null);
      return;
    }

    // Merge accumulated data if it's a progressive challenge
    const finalQuestions = [
      ...(result.accumulatedQuestions || []),
      ...result.questions
    ];
    const finalAnswers = {
      ...(result.accumulatedAnswers || {}),
      ...result.answers
    };

    const totalQuestions = finalQuestions.length;
    const correct = finalQuestions.reduce((a, q) => a + (finalAnswers[q.id] === q.correctIndex ? 1 : 0), 0);

    // Calculate success rate
    const successRate = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

    // Dynamic scoring: Max 20 points
    const earned = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 20) : 0;

    if (currentUserAccount) {
      const isPreset = !!result.presetId;
      const alreadyCompleted = isPreset && userStats.completedPresets.includes(result.presetId!);
      const isOfficialExam = result.mode === 'exam';
      const isChallenge = result.mode === 'challenge';

      // Get preset to check minimum success rate
      const preset = isPreset ? presets.find(p => p.id === result.presetId) : undefined;
      const minimumSuccessRate = preset?.minimumSuccessRate || 50; // Default 50%
      const isSuccessful = successRate >= minimumSuccessRate;

      // Rastrear desempenho por disciplina (desafios e provas oficiais)
      if ((isOfficialExam || isChallenge) && !alreadyCompleted) {
        const newDetailedStats = { ...(userStats.detailedStats || {}) };

        finalQuestions.forEach(question => {
          const answer = finalAnswers[question.id];
          if (answer === undefined) return; // Skip questions not reached

          const discipline = question.discipline || 'Geral';
          const isCorrect = answer === question.correctIndex;

          if (!newDetailedStats[discipline]) {
            newDetailedStats[discipline] = {};
          }

          // Rastrear por disciplina (simplificado sem tópico específico)
          const key = 'Geral';
          if (!newDetailedStats[discipline][key]) {
            newDetailedStats[discipline][key] = { correct: 0, total: 0 };
          }

          newDetailedStats[discipline][key].total++;
          if (isCorrect) {
            newDetailedStats[discipline][key].correct++;
          }
        });

        // Atualizar userStats com detailedStats
        setUserStats(prev => ({
          ...prev,
          detailedStats: newDetailedStats
        }));
      }

      // APENAS provas oficiais afetam score, accuracy e ranking
      // E APENAS na primeira vez (não ao refazer)
      if (isOfficialExam && !alreadyCompleted) {
        const newAccuracy = Math.round(((currentUserAccount.accuracy * currentUserAccount.questionsSolved) + (correct / finalQuestions.length * 100)) / (currentUserAccount.questionsSolved + 1));
        const newScore = currentUserAccount.score + earned;
        const newTotalQuestions = currentUserAccount.questionsSolved + finalQuestions.length;

        // Criar entrada no histórico de provas
        const historyEntry = {
          presetId: result.presetId!,
          presetTitle: preset?.title || 'Prova Oficial',
          score: earned,
          correct,
          total: totalQuestions,
          percentage: Math.round(successRate),
          completedAt: new Date().toISOString()
        };

        // Atualizar estatísticas globais (score, accuracy, ranking, examPoints)
        setUserStats(prev => ({
          ...prev,
          score: newScore,
          accuracy: newAccuracy,
          totalQuestions: newTotalQuestions,
          examPoints: (prev.examPoints || 0) + earned, // Pontos para níveis
          completedPresets: isPreset
            ? [...prev.completedPresets, result.presetId!]
            : prev.completedPresets,
          // Provas oficiais sempre marcam como sucesso quando completadas pela primeira vez
          successfulPresets: isPreset
            ? [...prev.successfulPresets, result.presetId!]
            : prev.successfulPresets,
          // Adicionar ao histórico de provas
          examHistory: [...(prev.examHistory || []), historyEntry]
        }));

        const updatedUser = {
          ...currentUserAccount,
          score: newScore,
          questionsSolved: newTotalQuestions,
          accuracy: newAccuracy
        };

        setCurrentUserAccount(updatedUser);
      } else if (isOfficialExam && alreadyCompleted) {
        // Refazendo prova oficial: NÃO atualiza nada (apenas permite treinar novamente)
        // Nenhuma alteração em score, accuracy ou ranking
      } else if (isChallenge) {
        // Desafios: distinguir entre progressivos e normais
        const alreadySuccessful = userStats.successfulPresets.includes(result.presetId!);

        // Verificar se é desafio progressivo
        const isProgressiveChallenge = preset?.isProgressiveWithLevels && preset?.progressiveLevels;

        if (isProgressiveChallenge && preset.progressiveLevels) {
          // Desafio Progressivo: calcular qual nível foi atingido
          const levelOrder = ['Fácil', 'Moderado', 'Médio', 'Médio Moderado', 'Difícil', 'Super Difícil'];

          console.log('🎮 PROGRESSIVE DEBUG - Start:', {
            currentLevel: result.currentLevel,
            presetId: result.presetId,
            accumulatedQuestionsLength: result.accumulatedQuestions?.length || 0,
            currentQuestionsLength: result.questions.length,
            totalQuestionsLength: finalQuestions.length,
            alreadyCompleted
          });

          // Encontrar o último nível completado (onde errou ou último se completou tudo)
          let levelReached = result.currentLevel || preset.progressiveLevels[0].level;
          const currentLevelIndex = preset.progressiveLevels.findIndex(l => l.level === result.currentLevel);

          // Se completou com sucesso o nível atual, esse é o nível atingido
          // Se falhou, é o nível anterior (se houver)
          // Verificar se errou alguma questão no nível ATUAL
          const currentLevelQuestions = result.questions;
          const currentLevelCorrect = currentLevelQuestions.reduce((acc, q) =>
            acc + (result.answers[q.id] === q.correctIndex ? 1 : 0), 0);
          const failedCurrentLevel = currentLevelCorrect < currentLevelQuestions.length;
          if (failedCurrentLevel && currentLevelIndex > 0) {
            // Falhou no nível atual, então o nível atingido é o anterior
            levelReached = preset.progressiveLevels[currentLevelIndex - 1]?.level || levelReached;
          } else if (!failedCurrentLevel && currentLevelIndex === preset.progressiveLevels.length - 1) {
            // Completou o último nível com sucesso = 100%
            levelReached = result.currentLevel!;
          }

          // Verificar se o nível atingido é suficiente para desbloquear (>= Médio Moderado)
          const levelReachedIndex = levelOrder.indexOf(levelReached);
          const minLevelIndex = levelOrder.indexOf('Médio Moderado');
          const canUnlock = levelReachedIndex >= minLevelIndex;

          // 100% completo = chegou no último nível E completou ele
          const is100Complete = levelReached === 'Super Difícil' && !failedCurrentLevel;

          setUserStats(prev => ({
            ...prev,
            // Só adiciona a completedPresets se ainda não estava
            completedPresets: alreadyCompleted
              ? prev.completedPresets
              : [...prev.completedPresets, result.presetId!],
            // Adiciona a successfulPresets se pode desbloquear E ainda não está lá
            successfulPresets: (canUnlock && !alreadySuccessful)
              ? [...prev.successfulPresets, result.presetId!]
              : prev.successfulPresets,
            // SEMPRE salvar nível atingido (atualiza se melhorou)
            progressiveLevelsReached: {
              ...prev.progressiveLevelsReached,
              [result.presetId!]: is100Complete ? '100%' : levelReached
            }
          }));
        } else {
          // Desafio Normal: verificar tipo para determinar critério
          const isReadingChallenge = preset?.challengeSubType === 'reading';
          const is100Percent = successRate === 100;

          // Desafios de leitura exigem 100%, outros usam taxa mínima
          const meetsRequirement = isReadingChallenge ? is100Percent : isSuccessful;

          // Atualizar se:
          // 1. Ainda não completou (primeira vez)
          // 2. Já completou mas não teve sucesso E agora teve sucesso
          if (!alreadyCompleted || (meetsRequirement && !alreadySuccessful)) {
            setUserStats(prev => ({
              ...prev,
              completedPresets: alreadyCompleted ? prev.completedPresets : [...prev.completedPresets, result.presetId!],
              successfulPresets: (meetsRequirement && !alreadySuccessful)
                ? [...prev.successfulPresets, result.presetId!]
                : prev.successfulPresets
            }));
          }
        }
      } else {
        // Random: apenas marcar como completado se preset
        if (isPreset && !alreadyCompleted) {
          setUserStats(prev => ({
            ...prev,
            completedPresets: [...prev.completedPresets, result.presetId!]
          }));
        }
      }

      // --- PERSISTÊNCIA NO SUPABASE ---
      // 1. Atualizar Perfil (Score, Accuracy, Questions Solved, Exam Points, Stats JSON)
      const successRateInt = Math.round(successRate);
      const earnedPoints = earned;
      const finalQuestionsLength = finalQuestions.length;

      // Usar a versão atualizada do account para o banco
      const currentScore = (result.mode === 'exam' || result.mode === 'challenge') && !alreadyCompleted ? currentUserAccount.score + earnedPoints : currentUserAccount.score;
      const currentAccuracy = (result.mode === 'exam' || result.mode === 'challenge') && !alreadyCompleted
        ? Math.round(((currentUserAccount.accuracy * currentUserAccount.questionsSolved) + (correct / finalQuestionsLength * 100)) / (currentUserAccount.questionsSolved + 1))
        : currentUserAccount.accuracy;
      const currentSolved = (result.mode === 'exam' || result.mode === 'challenge') && !alreadyCompleted ? currentUserAccount.questionsSolved + finalQuestionsLength : currentUserAccount.questionsSolved;

      // ATUALIZAÇÃO SÍNCRONA DO ESTADO LOCAL
      setUserStats(prev => {
        const updatedStats = { ...prev };
        // Cleanup old stats if they existed
        return updatedStats;
      });

      // OPERAÇÃO ASSÍNCRONA DE BANCO (FORA DO SETTER)
      (async () => {
        try {
          console.log('📡 Sincronizando resultados com Supabase...');

          // Clonar stats para salvar, MAS remover o rank e listas persistidas separadamente
          // para evitar dados obsoletos ou poluição no JSON de estatísticas
          const statsToSave = { ...userStats };
          delete (statsToSave as any).rank;
          delete (statsToSave as any).favoriteSummaries;
          delete (statsToSave as any).favoriteTopics;
          delete (statsToSave as any).readSummaries;
          delete (statsToSave as any).readTopics;

          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              score: currentScore,
              accuracy: currentAccuracy,
              questions_solved: currentSolved,
              exam_points: userStats.examPoints,
              stats: statsToSave
            })
            .eq('id', currentUserAccount.id);

          if (profileError) console.error('❌ Erro ao salvar perfil no Supabase:', profileError);

          // 2. Registrar Resultado da Simulação (Histórico Detalhado)
          const { error: resultError } = await supabase
            .from('simulado_results')
            .insert({
              user_id: currentUserAccount.id,
              preset_id: result.presetId,
              mode: result.mode,
              total_questions: totalQuestions,
              correct_answers: correct,
              score: earnedPoints,
              percentage: successRateInt,
              current_level: result.currentLevel,
              metadata: {
                is_successful: successRate >= (preset?.minimumSuccessRate || 50),
                is_first_time: !alreadyCompleted
              }
            });

          if (!resultError) console.log('✅ Resultado registrado com sucesso!');
          if (resultError) console.error('❌ Erro ao registrar resultado no Supabase:', resultError);

          // 3. Atualizar ranking global/semanal (Garante que a posição seja atualizada após o insert)
          await fetchRanking();
        } catch (err) {
          console.error('❌ Erro inesperado na persistência:', err);
        }
      })();
    }

    // Save the mode so SimuladoConfig can return to the same tab
    localStorage.setItem('lastSimuladoMode', result.mode);

    handleNavigate('simulado-config');
    setSimuladoSession(null);
  };

  const handleReportQuestion = (question: Question) => {
    if (!currentUserAccount) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString('pt-BR');

    // Encontrar o título da prova atual
    let presetTitle = 'Treino Aleatório';
    if (simuladoSession?.presetId) {
      const currentPreset = presets.find(p => p.id === simuladoSession.presetId);
      if (currentPreset) {
        presetTitle = currentPreset.title;
      }
    }

    const newNotification: Notification = {
      id: `report_${Date.now()}`,
      title: '⚠️ Questão Reportada',
      message: `${currentUserAccount.fullName} reportou que a resposta da questão "${question.text.substring(0, 50)}..." está incorreta.\n\n📋 Prova: ${presetTitle}`,
      time: timeString,
      read: false,
      type: 'question_report',
      targetUserId: 'admin_master', // Apenas para o admin
      questionData: {
        questionId: question.id,
        questionText: question.text,
        discipline: question.discipline,
        reportedBy: currentUserAccount.fullName,
        reportedAt: `${dateString} às ${timeString}`,
        presetTitle: presetTitle
      }
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  const renderContent = () => {
    // SECURITY: Restrict admin panel access to admins only
    if (currentView === 'admin-panel' && userRole !== 'admin') {
      setTimeout(() => setCurrentView('dashboard'), 0);
      return null;
    }

    if (isAuthenticated && userRole === 'user' && currentUserAccount && !currentUserAccount.onboardingCompleted) {
      return <OnboardingSurvey userName={currentUserAccount.name} onComplete={handleCompleteOnboarding} />;
    }

    if (currentView === 'admin-panel') {
      return (
        <AdminPanel
          onBack={() => setCurrentView('profile')}
          summaries={adminSummaries} topicTree={topicTree}
          notifications={notifications}
          users={users.filter(u => u.role === 'user')}
          presets={presets}
          onAddSummary={async s => {
            const { error } = await supabase.from('admin_summaries').upsert({
              id: s.id,
              title: s.title,
              category: s.category,
              content: s.content,
              date: s.date,
              is_new: s.isNew,
              image_url: s.imageUrl,
              is_vip: s.isVip
            });
            if (error) console.error('Error saving summary:', error);
            fetchSummaries();
          }}
          onDeleteSummary={async id => {
            const { error } = await supabase.from('admin_summaries').delete().eq('id', id);
            if (error) console.error('Error deleting summary:', error);
            fetchSummaries();
          }}
          onSendNotification={async n => {
            const { error } = await supabase.from('notifications').insert({
              id: n.id,
              title: n.title,
              message: n.message,
              time: n.time,
              read: n.read,
              type: n.type,
              target_user_id: n.targetUserId,
              question_data: n.questionData
            });
            if (error) console.error('Error sending notification:', error);
            fetchNotifications();
          }}
          onUpdateNotification={async n => {
            const { error } = await supabase.from('notifications').update({
              title: n.title,
              message: n.message,
              time: n.time,
              read: n.read,
              type: n.type,
              target_user_id: n.targetUserId,
              question_data: n.questionData
            }).eq('id', n.id);
            if (error) console.error('Error updating notification:', error);
            fetchNotifications();
          }}
          onDeleteNotification={async id => {
            const { error } = await supabase.from('notifications').delete().eq('id', id);
            if (error) console.error('Error deleting notification:', error);
            fetchNotifications();
          }}
          onAddTopic={async (parentId, newNode) => {
            const { error } = await supabase.from('topics').insert({
              id: newNode.id,
              parent_id: parentId === 'root' ? 'root' : parentId,
              title: newNode.title,
              type: newNode.type,
              content: newNode.content,
              is_vip: newNode.isVip
            });
            if (error) {
              console.error('Error adding topic:', error);
              alert('Erro ao salvar matéria no banco de dados.');
            } else {
              fetchTopics();
            }
          }}
          onDeleteTopic={async (id) => {
            if (id === 'root') return;
            const { error } = await supabase.from('topics').delete().eq('id', id);
            if (error) {
              console.error('Error deleting topic:', error);
              alert('Erro ao excluir matéria.');
            } else {
              fetchTopics();
            }
          }}
          onAddPreset={async p => {
            const { error } = await supabase.from('presets').upsert({
              id: p.id,
              title: p.title,
              description: p.description,
              type: p.type,
              challenge_sub_type: p.challengeSubType,
              level: p.level,
              institution: p.institution,
              year: p.year,
              area: p.area,
              time_limit: p.timeLimit,
              total_points: p.totalPoints,
              question_count: p.questionCount,
              questions: p.questions,
              status: p.status,
              scheduled_days: p.scheduledDays,
              order: p.order,
              is_progressive_with_levels: p.isProgressiveWithLevels,
              progressive_levels: p.progressiveLevels,
              reading_content: p.readingContent,
              is_vip: p.isVip,
              minimum_success_rate: p.minimumSuccessRate
            });
            if (error) console.error('Error saving preset:', error);
            fetchPresets();
          }}
          onDeletePreset={async id => {
            const { error } = await supabase.from('presets').delete().eq('id', id);
            if (error) console.error('Error deleting preset:', error);
            fetchPresets();
          }}
          onConfirmUser={handleConfirmUser}
          onDeleteUser={async (id) => {
            if (!confirm('Esta ação é irreversível! Todos os dados, pontos e resultados do usuário serão apagados permanentemente. Deseja continuar?')) {
              return;
            }

            try {
              console.log('🔵 Admin: Iniciando exclusão total do usuário:', id);

              // 1. Tentar via RPC seguro (delete_user_as_admin)
              const { error: rpcError } = await supabase.rpc('delete_user_as_admin', { target_id: id });

              if (rpcError) {
                console.warn('⚠️ Erro na RPC delete_user_as_admin:', rpcError);

                // Tentativa via Profile delete (Migração 018 disparará o TRIGGER que remove o auth.user)
                console.log('⚠️ Tentando exclusão via Profile delete (Trigger 018)...');
                const { error: profileError } = await supabase
                  .from('profiles')
                  .delete()
                  .eq('id', id);

                if (profileError) {
                  console.error('❌ Todas as tentativas de exclusão falharam:', profileError);
                  throw new Error(`Falha ao excluir: ${rpcError?.message || profileError.message}`);
                }
                console.log('✅ Usuário excluído via Trigger de Perfil!');
              } else {
                console.log('✅ Usuário deletado com sucesso via RPC!');
              }

              // 2. Atualizar estado local
              setUsers(prev => prev.filter(u => u.id !== id));

              // 3. Notificar sucesso
              alert('✅ Usuário e todos os seus dados foram apagados permanentemente com sucesso!');
            } catch (error: any) {
              console.error('❌ Erro crítico ao excluir usuário:', error);
              alert(`❌ Erro ao excluir usuário: ${error.message}\n\nNota: Verifique se a migração '018_fix_user_erasure.sql' foi aplicada.`);
            }
          }}
          onUpdateUserPoints={handleUpdateUserPoints}
          onToggleUserVip={handleToggleUserVip}
          onUpdateSummary={handleUpdateSummary}
          onUpdateTopic={async (id, updatedNode) => {
            const { error } = await supabase
              .from('topics')
              .update({
                title: updatedNode.title,
                content: updatedNode.content,
                is_vip: updatedNode.isVip
              })
              .eq('id', id);
            if (error) {
              console.error('Error updating topic:', error);
              alert('Erro ao atualizar matéria.');
            } else {
              fetchTopics();
            }
          }}
          onUpdatePreset={async p => {
            const { error } = await supabase.from('presets').update({
              title: p.title,
              description: p.description,
              type: p.type,
              challenge_sub_type: p.challengeSubType,
              level: p.level,
              institution: p.institution,
              year: p.year,
              area: p.area,
              time_limit: p.timeLimit,
              total_points: p.totalPoints,
              question_count: p.questionCount,
              questions: p.questions,
              status: p.status,
              scheduled_days: p.scheduledDays,
              order: p.order,
              is_progressive_with_levels: p.isProgressiveWithLevels,
              progressive_levels: p.progressiveLevels,
              reading_content: p.readingContent,
              is_vip: p.isVip,
              minimum_success_rate: p.minimumSuccessRate
            }).eq('id', p.id);
            if (error) console.error('Error updating preset:', error);
            fetchPresets();
          }}
          appTips={appTips}
          onAddTip={async tip => {
            console.log('🔵 Tentando adicionar dica:', tip);

            // Verificar autenticação
            const { data: { session } } = await supabase.auth.getSession();
            console.log('🔑 Sessão atual:', session);
            console.log('👤 Usuário autenticado:', session?.user?.id || 'NÃO AUTENTICADO');

            const { data, error } = await supabase.from('app_tips').insert({
              id: tip.id,
              content: tip.content,
              author: tip.author,
              timestamp: new Date().toISOString()
            }).select();

            if (error) {
              console.error('❌ Erro ao adicionar dica:', error);
              alert(`❌ Erro ao publicar dica: ${error.message}`);
              return;
            }

            console.log('✅ Dica adicionada com sucesso:', data);
            await fetchTips();
            console.log('🔄 Tips atualizadas após inserção');
          }}
          onDeleteTip={async id => {
            const { error } = await supabase.from('app_tips').delete().eq('id', id);
            if (error) console.error('Error deleting tip:', error);
            fetchTips();
          }}
          studyGuides={studyGuides}
          onAddStudyGuide={async sg => {
            const { error } = await supabase.from('study_guides').upsert({
              id: sg.id,
              discipline: sg.discipline,
              topics: sg.topics
            });
            if (error) console.error('Error saving study guide:', error);
            fetchStudyGuides();
          }}
          onUpdateStudyGuide={async sg => {
            const { error } = await supabase.from('study_guides').update({
              discipline: sg.discipline,
              topics: sg.topics
            }).eq('id', sg.id);
            if (error) console.error('Error updating study guide:', error);
            fetchStudyGuides();
          }}
          onDeleteStudyGuide={async id => {
            const { error } = await supabase.from('study_guides').delete().eq('id', id);
            if (error) console.error('Error deleting study guide:', error);
            fetchStudyGuides();
          }}
          trainingQuestions={trainingQuestions}
          onAddTrainingQuestion={async q => {
            const { error } = await supabase.from('training_questions').upsert({
              id: q.id,
              discipline: q.discipline,
              text: q.text,
              options: q.options,
              correct_index: q.correctIndex,
              explanation: q.explanation,
              difficulty: q.difficulty,
              type: q.type,
              tags: q.tags
            });
            if (error) console.error('Error saving training question:', error);
            fetchTrainingQuestions();
          }}
          onImportTrainingQuestions={async questions => {
            const { error } = await supabase.from('training_questions').upsert(questions.map(q => ({
              id: q.id,
              discipline: q.discipline,
              text: q.text,
              options: q.options,
              correct_index: q.correctIndex,
              explanation: q.explanation,
              difficulty: q.difficulty,
              type: q.type,
              tags: q.tags
            })));
            if (error) console.error('Error importing training questions:', error);
            fetchTrainingQuestions();
          }}
          onDeleteTrainingQuestion={async id => {
            const { error } = await supabase.from('training_questions').delete().eq('id', id);
            if (error) console.error('Error deleting training question:', error);
            fetchTrainingQuestions();
          }}
          materials={adminMaterials}
          onAddMaterial={async m => {
            const { error } = await supabase.from('admin_materials').insert({
              id: m.id,
              title: m.title,
              cover_url: m.coverUrl,
              description: m.description,
              download_url: m.downloadUrl,
              date: m.date,
              is_vip: m.isVip
            });
            if (error) console.error('Error saving material:', error);
            fetchMaterials();
          }}
          onUpdateMaterial={async m => {
            const { error } = await supabase.from('admin_materials').update({
              title: m.title,
              cover_url: m.coverUrl,
              description: m.description,
              download_url: m.downloadUrl,
              date: m.date,
              is_vip: m.isVip
            }).eq('id', m.id);
            if (error) console.error('Error updating material:', error);
            fetchMaterials();
          }}
          onDeleteMaterial={async id => {
            const { error } = await supabase.from('admin_materials').delete().eq('id', id);
            if (error) console.error('Error deleting material:', error);
            fetchMaterials();
          }}
          isDesktopMode={isAdminDesktopMode}
          onToggleDesktopMode={setIsAdminDesktopMode}
          exams={exams}
          examAccessRecords={examAccessRecords}
          onAddExam={async e => {
            console.log('🔵 Tentando adicionar prova oficial:', e);

            // Verificar autenticação
            const { data: { session } } = await supabase.auth.getSession();
            console.log('🔑 Sessão atual:', session?.user?.id || 'NÃO AUTENTICADO');

            const { data, error } = await supabase.from('exams').insert({
              id: e.id,
              title: e.title,
              content: e.content,
              time_limit: e.timeLimit,
              is_vip: e.isVip,
              active: e.active
            }).select();

            if (error) {
              console.error('❌ Erro ao adicionar prova:', error);
              alert(`❌ Erro ao publicar prova: ${error.message}`);
              return;
            }

            console.log('✅ Prova adicionada com sucesso:', data);
            await fetchExams();
            console.log('🔄 Provas atualizadas');
          }}
          onUpdateExam={async e => {
            const { error } = await supabase.from('exams').update({
              title: e.title,
              content: e.content,
              time_limit: e.timeLimit,
              is_vip: e.isVip,
              active: e.active
            }).eq('id', e.id);
            if (error) console.error('Error updating exam:', error);
            fetchExams();
          }}
          onDeleteExam={async id => {
            const { error } = await supabase.from('exams').delete().eq('id', id);
            if (error) console.error('Error deleting exam:', error);
            fetchExams();
          }}
        />
      );
    }

    switch (currentView) {
      case 'dashboard': {
        // Filter notifications for current user: global (no targetUserId) + user-specific
        const filteredNotifications = notifications.filter(n =>
          !n.targetUserId || n.targetUserId === currentUserAccount?.id
        );

        return (
          <Dashboard
            onNavigate={handleNavigate}
            userStats={userStats}
            rankingList={rankingList}
            notifications={filteredNotifications}
            onMarkNotificationRead={id => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
            onMarkAllNotificationsRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
            user={currentUserAccount!}
            appTips={appTips}
            studyGuides={studyGuides}
            onStartRandomSimulado={() => startSimulado({ mode: 'random', questionCount: 10 })}
            exams={exams}
            onStartExam={handleStartExam}
            isAdminVipMode={isAdminVipMode}
          />
        );
      }
      case 'ranking-detail': {
        return <RankingDetail rankingList={rankingList} onBack={goBack} currentUser={currentUserAccount} />;
      }
      case 'contents': return <ContentsView contents={[]} adminSummaries={adminSummaries} adminMaterials={adminMaterials} topicTree={topicTree} userStats={userStats} isUserVip={(userRole === 'admin' ? isAdminVipMode : currentUserAccount?.isVip) || false} onUpdateStats={setUserStats} onToggleFavorite={handleToggleFavorite} onToggleRead={handleToggleRead} />;
      case 'simulado-config': return <SimuladoConfig onBack={goBack} onStart={startSimulado} presets={presets} userStats={userStats} isUserVip={(userRole === 'admin' ? isAdminVipMode : currentUserAccount?.isVip) || false} isDevMode={isDevMode} />;
      case 'simulado-run':
        if (simuladoSession) {
          return (
            <SimuladoRun
              key={simuladoSession.id}
              session={simuladoSession}
              onFinish={finishSimulado}
              onAbort={goBack}
              onReportQuestion={handleReportQuestion}
              isProgressive={simuladoSession.isProgressive}
              currentLevel={simuladoSession.currentLevel}
              onNextLevel={handleNextProgressiveLevel}
              isLastLevel={(() => {
                if (!simuladoSession.presetId) return true;
                const preset = presets.find(p => p.id === simuladoSession.presetId);
                if (!preset || !preset.progressiveLevels) return true;
                return currentProgressiveLevelIndex === preset.progressiveLevels.length - 1;
              })()}
              progressiveLevels={(() => {
                if (!simuladoSession.presetId) return undefined;
                const preset = presets.find(p => p.id === simuladoSession.presetId);
                return preset?.progressiveLevels;
              })()}
            />
          );
        }
        // No session, redirect to config
        setTimeout(() => setCurrentView('simulado-config'), 0);
        return null;
      case 'profile': return currentUserAccount ? <ProfileView isDarkMode={isDarkMode} toggleTheme={toggleTheme} userStats={userStats} onLogout={handleLogout} onOpenAdmin={() => setCurrentView('admin-panel')} userRole={userRole} user={currentUserAccount} onResetStats={handleResetStats} onDeleteAccount={handleDeleteAccount} isAdminVipMode={isAdminVipMode} isDevMode={isDevMode} onToggleAdminVip={() => setIsAdminVipMode(!isAdminVipMode)} onToggleDevMode={() => setIsDevMode(!isDevMode)} examAccessRecords={examAccessRecords} exams={exams} /> : null;
      case 'exam-view':
        if (activeExam && currentUserAccount) {
          return (
            <ExamView
              exam={activeExam}
              onBack={goBack}
              onExamStart={(userName, userPhone) => handleExamStart(activeExam.id, userName, userPhone)}
              onExamFinish={() => handleExamFinish(activeExam.id)}
              onExamNotFinished={() => handleExamNotFinished(activeExam.id)}
              examAccessRecords={examAccessRecords}
              currentUserId={currentUserAccount.id}
            />
          );
        }
        setTimeout(() => setCurrentView('dashboard'), 0);
        return null;
      default:
        // Invalid view, redirect to dashboard
        setTimeout(() => setCurrentView('dashboard'), 0);
        return null;
    }
  };

  // Mostrar loading enquanto verifica sessão
  if (isLoadingSession && !dbConnectionError) {
    return (
      <div className="bg-[#0F172A] min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-sm font-bold animate-pulse">Iniciando Sistema...</p>
          <p className="text-slate-400 text-xs mt-4">Conectando ao servidor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} onRegister={handleRegister} onAdminAccess={handleAdminAccess} existingUsers={users} dbConnectionError={dbConnectionError} />;

  // Guard: Se estiver autenticado mas o perfil ainda não carregou, mostrar loading
  if (isAuthenticated && !currentUserAccount && userRole !== 'admin') {
    console.log('⏳ Perfil autenticado mas dados da conta ainda não disponíveis. Segurando render...');
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F0F0F7] dark:bg-gray-900 p-4">
        <div className="text-center mb-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto mb-4"></div>
          <p className="text-brand-dark dark:text-white font-bold mb-2">Sincronizando seu perfil...</p>
          <p className="text-xs text-gray-500">Se demorar muito, sua conexão pode estar lenta ou a conta foi removida.</p>
        </div>

        {dbConnectionError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl max-w-xs mx-auto">
            <p className="text-red-400 text-xs text-center font-bold">Falha na conexão com o banco de dados.</p>
            <button
              onClick={handleLogout}
              className="mt-3 w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all"
            >
              Sair e Tentar Novamente
            </button>
          </div>
        )}

        {!dbConnectionError && (
          <button
            onClick={handleLogout}
            className="mt-8 px-6 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all"
          >
            Cancelar e Voltar ao Login
          </button>
        )}
      </div>
    );
  }

  const isSimulado = currentView === 'simulado-run';
  const showNav = !isSimulado && currentView !== 'ranking-detail' && currentView !== 'admin-panel' && (currentUserAccount?.onboardingCompleted || userRole === 'admin');

  return (
    <div className="bg-[#F0F0F7] dark:bg-gray-900 min-h-screen font-sans flex justify-center transition-all duration-300">
      <div className={`w-full ${currentView === 'admin-panel' && isAdminDesktopMode ? '' : 'max-w-md'} bg-[#F0F0F7] dark:bg-gray-900 h-[100dvh] flex flex-col relative`}>

        {/* Back Button - Omit for views that provide their own header navigation */}
        {navigationHistory.length > 0 &&
          currentView !== 'admin-panel' &&
          currentView !== 'simulado-config' &&
          currentView !== 'ranking-detail' &&
          currentView !== 'exam-view' &&
          currentView !== 'simulado-run' && (
            <button
              onClick={handleBack}
              className="absolute top-4 left-4 z-50 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-all group animate-fade-in"
              title="Voltar"
            >
              <ChevronLeft size={28} className="text-slate-700 dark:text-white group-hover:-translate-x-1 transition-transform" />
            </button>
          )}

        <main className={`overflow-y-auto no-scrollbar ${currentView === 'admin-panel' ? '' : 'p-4 pb-24'}`}>
          <div key={currentView} className="animate-page-enter w-full">
            {renderContent()}
          </div>
        </main>
        {showNav && <BottomNav currentView={currentView} onChange={handleNavigate} />}
      </div>
    </div>
  );
};

export default App;
