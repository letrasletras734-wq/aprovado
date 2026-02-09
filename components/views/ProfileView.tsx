import { Trash2, RotateCcw, X, AlertTriangle, Sun, Moon, ShieldCheck, Trophy, Phone, Copy, MessageCircle, FileText, Users, ArrowRight } from 'lucide-react';
import { UserAccount, UserStats, UserRole, ExamAccessRecord, OfficialExam } from '../../types';
import { Button } from '../Button';
import { getUserLevel, getNextLevel, getLevelProgress } from '../../constants';

interface ProfileViewProps {
    isDarkMode: boolean;
    toggleTheme: () => void;
    userStats: UserStats;
    onLogout: () => void;
    onOpenAdmin?: () => void;
    userRole: UserRole;
    user: UserAccount;
    onResetStats?: (password: string) => boolean;
    onDeleteAccount?: (password: string) => boolean | Promise<boolean>;
    isAdminVipMode?: boolean;
    isDevMode?: boolean;
    onToggleAdminVip?: () => void;
    onToggleDevMode?: () => void;
    examAccessRecords?: ExamAccessRecord[];
    exams?: OfficialExam[];
}

export const ProfileView: React.FC<ProfileViewProps> = ({
    isDarkMode,
    toggleTheme,
    userStats,
    onLogout,
    onOpenAdmin,
    userRole,
    user,
    onResetStats,
    onDeleteAccount,
    isAdminVipMode,
    isDevMode,
    onToggleAdminVip,
    onToggleDevMode,
    examAccessRecords,
    exams
}) => {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'reset' | 'delete' | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogoutClick = async () => {
        setIsLoggingOut(true);
        // Small delay to ensure the user sees the "explosive" feedback and loading state
        await new Promise(resolve => setTimeout(resolve, 800));
        onLogout();
    };

    const handleConfirm = async () => {
        setIsProcessing(true);
        setError('');

        let success = false;
        if (confirmAction === 'reset' && onResetStats) {
            success = onResetStats(passwordInput);
            if (success) {
                alert('✅ Статус zerado com sucesso!');
                setShowConfirmModal(false);
                setPasswordInput('');
                setError('');
            } else {
                setError('❌ Senha incorreta!');
            }
        } else if (confirmAction === 'delete' && onDeleteAccount) {
            success = await onDeleteAccount(passwordInput);
            // Se sucesso, o usuário será deslogado automaticamente
            if (!success) {
                setError('❌ Senha incorreta!');
            }
        }

        setIsProcessing(false);
    };

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="text-center py-6">
                <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-brand-purple shadow-lg"
                />
                <h2 className="text-2xl font-black text-brand-dark dark:text-white">{user.fullName}</h2>
                <p className="text-sm text-brand-muted dark:text-gray-400">{user.email}</p>
            </div>

            {/* Level System */}
            {(() => {
                const currentLevel = getUserLevel(userStats.examPoints || 0);
                const nextLevel = getNextLevel(userStats.examPoints || 0);
                const progress = getLevelProgress(userStats.examPoints || 0);

                return (
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="text-4xl">{currentLevel.icon}</div>
                                <div>
                                    <h3 className="text-xl font-black text-white">{currentLevel.name}</h3>
                                    <p className="text-xs text-white/80">{currentLevel.description}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-white">{userStats.examPoints || 0}</p>
                                <p className="text-xs text-white/80">Pontos</p>
                            </div>
                        </div>

                        {nextLevel && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-white/90">
                                    <span>Progresso para {nextLevel.name}</span>
                                    <span>{progress.percentage}%</span>
                                </div>
                                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full transition-all duration-1000"
                                        style={{ width: `${progress.percentage}%` }}
                                    />
                                </div>
                                <p className="text-xs text-white/80 text-center">
                                    Faltam {progress.pointsToNext} pontos para o próximo nível
                                </p>
                            </div>
                        )}

                        {!nextLevel && (
                            <div className="bg-white/10 rounded-2xl p-4 text-center">
                                <p className="text-sm font-bold text-white">🎉 Nível Máximo Alcançado!</p>
                                <p className="text-xs text-white/80 mt-1">Você chegou ao topo!</p>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl text-center">
                    <p className="text-2xl font-black text-brand-purple">{user.score}</p>
                    <p className="text-xs text-brand-muted dark:text-gray-400">Pontos</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl text-center">
                    <p className="text-2xl font-black text-brand-green">{user.accuracy}%</p>
                    <p className="text-xs text-brand-muted dark:text-gray-400">Precisão</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl text-center">
                    <p className="text-2xl font-black text-brand-dark dark:text-white">{user.questionsSolved}</p>
                    <p className="text-xs text-brand-muted dark:text-gray-400">Questões</p>
                </div>
            </div>

            {/* Exam History */}
            {userStats.examHistory && userStats.examHistory.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-brand-dark dark:text-white flex items-center gap-2">
                        <Trophy size={18} className="text-yellow-500" />
                        📋 Histórico de Provas
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {[...userStats.examHistory]
                            .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                            .map((entry, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-brand-dark dark:text-white">{entry.presetTitle}</p>
                                        <p className="text-xs text-brand-muted dark:text-gray-400">
                                            {new Date(entry.completedAt).toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <p className="text-lg font-black text-brand-purple">{entry.score}</p>
                                            <p className="text-[10px] text-brand-muted dark:text-gray-400">pts</p>
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-lg font-black ${entry.percentage >= 70 ? 'text-green-500' : entry.percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                {entry.percentage}%
                                            </p>
                                            <p className="text-[10px] text-brand-muted dark:text-gray-400">{entry.correct}/{entry.total}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Official Exams History (No points) */}
            {examAccessRecords && examAccessRecords.filter(r => r.userId === user.id).length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-brand-dark dark:text-white flex items-center gap-2">
                        <FileText size={18} className="text-indigo-500" />
                        📝 Exames Oficiais Acessados
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {examAccessRecords
                            .filter(r => r.userId === user.id)
                            .sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime())
                            .map((record, index) => {
                                const exam = exams?.find(e => e.id === record.examId);
                                const endTime = new Date(new Date(record.accessedAt).getTime() + (exam?.timeLimit || 60) * 60 * 1000);
                                const isExpired = new Date() > endTime;

                                return (
                                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="font-bold text-sm text-brand-dark dark:text-white">
                                                {exam?.title || 'Exame'}
                                            </p>
                                            <p className="text-xs text-brand-muted dark:text-gray-400">
                                                Acessado em: {new Date(record.accessedAt).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isExpired ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                            {isExpired ? 'Encerrado' : 'Ativo'}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* WhatsApp Group Button */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-blue-200 dark:border-indigo-800 rounded-2xl p-5">
                <a
                    href="https://chat.whatsapp.com/BYvje9O3s9w7qUwwK6tRm4?mode=gi_t"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between group hover:scale-[1.02] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                            <Users size={24} className="text-white" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-brand-dark dark:text-white">Grupo de Estudos</p>
                            <p className="text-xs text-indigo-700 dark:text-indigo-400">Comunidade • WhatsApp</p>
                        </div>
                    </div>
                    <ArrowRight size={20} className="text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </a>
            </div>

            {/* Support Contact Button */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5">
                <button
                    onClick={() => setShowSupportModal(true)}
                    className="w-full flex items-center justify-between group hover:scale-[1.02] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                            <Phone size={24} className="text-white" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-brand-dark dark:text-white">Contactar Suporte</p>
                            <p className="text-xs text-green-700 dark:text-green-400">WhatsApp • Telefone</p>
                        </div>
                    </div>
                    <MessageCircle size={20} className="text-green-600 dark:text-green-400 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Theme Toggle */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                        <span className="font-bold">Tema {isDarkMode ? 'Escuro' : 'Claro'}</span>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="px-4 py-2 bg-brand-purple text-white rounded-xl font-bold"
                    >
                        Alternar
                    </button>
                </div>
            </div>

            {/* Admin Access */}
            {userRole === 'admin' && onOpenAdmin && (
                <button
                    onClick={onOpenAdmin}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-5 rounded-2xl flex items-center justify-center gap-3 font-bold"
                >
                    <ShieldCheck size={20} />
                    Painel Administrativo
                </button>
            )}

            {/* Admin Test Modes - Only for admin users */}
            {userRole === 'admin' && (onToggleAdminVip || onToggleDevMode) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        🛠️ Modo de Teste (Admin)
                    </h3>
                    <p className="text-xs text-blue-600/80 dark:text-blue-300/80">
                        Use esses modos para testar funcionalidades sem afetar dados reais.
                    </p>

                    <div className="space-y-3">
                        {/* VIP Simulation Toggle */}
                        {onToggleAdminVip && (
                            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">⭐</span>
                                    <div>
                                        <p className="font-bold text-sm text-brand-dark dark:text-white">Simular VIP</p>
                                        <p className="text-[10px] text-brand-muted dark:text-gray-400">Testar como usuário VIP/não-VIP</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onToggleAdminVip}
                                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${isAdminVipMode
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}
                                >
                                    {isAdminVipMode ? 'VIP ON' : 'VIP OFF'}
                                </button>
                            </div>
                        )}

                        {/* DEV Mode Toggle */}
                        {onToggleDevMode && (
                            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🔧</span>
                                    <div>
                                        <p className="font-bold text-sm text-brand-dark dark:text-white">Modo DEV</p>
                                        <p className="text-[10px] text-brand-muted dark:text-gray-400">Abrir qualquer prova sem afetar dados</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onToggleDevMode}
                                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${isDevMode
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}
                                >
                                    {isDevMode ? 'DEV ON' : 'DEV OFF'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Danger Zone */}
            {(onResetStats || onDeleteAccount) && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle size={18} />
                        Zona de Perigo
                    </h3>

                    {onResetStats && (
                        <button
                            onClick={() => {
                                setConfirmAction('reset');
                                setShowConfirmModal(true);
                                setError('');
                                setPasswordInput('');
                            }}
                            className="w-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-600 dark:text-orange-400 p-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all"
                        >
                            <RotateCcw size={18} />
                            Zerar Status
                        </button>
                    )}

                    {onDeleteAccount && (
                        <button
                            onClick={() => {
                                setConfirmAction('delete');
                                setShowConfirmModal(true);
                                setError('');
                                setPasswordInput('');
                            }}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all"
                        >
                            <Trash2 size={18} />
                            Excluir Conta Permanentemente
                        </button>
                    )}
                </div>
            )}

            {/* Logout */}
            <button
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className="w-full bg-gray-200 dark:bg-gray-700 text-brand-dark dark:text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-200 active:scale-95 hover:scale-[1.02] disabled:opacity-70"
            >
                {isLoggingOut ? (
                    <>
                        <RotateCcw size={20} className="animate-spin" />
                        Saindo...
                    </>
                ) : (
                    <>
                        <RotateCcw size={20} className="rotate-180" />
                        Sair da Conta
                    </>
                )}
            </button>



            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full space-y-4 animate-scale-in">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-brand-dark dark:text-white">
                                {confirmAction === 'reset' ? '⚠️ Zerar Status' : '🗑️ Excluir Conta'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setPasswordInput('');
                                    setError('');
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {confirmAction === 'reset' ? (
                            <>
                                <p className="text-sm text-brand-muted dark:text-gray-400">
                                    Isso irá resetar TODAS as suas estatísticas, progresso e conquistas. Esta ação é irreversível!
                                </p>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-brand-dark dark:text-white uppercase">
                                        Digite sua senha para confirmar:
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordInput}
                                        onChange={e => {
                                            setPasswordInput(e.target.value);
                                            setError('');
                                        }}
                                        placeholder="Senha"
                                        className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-4 outline-none focus:ring-2 focus:ring-brand-purple"
                                        onKeyPress={e => e.key === 'Enter' && handleConfirm()}
                                    />
                                    {error && (
                                        <p className="text-xs text-red-500 font-bold">{error}</p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowConfirmModal(false);
                                            setPasswordInput('');
                                            setError('');
                                        }}
                                        className="flex-1 bg-gray-200 dark:bg-gray-700 text-brand-dark dark:text-white p-4 rounded-xl font-bold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={isProcessing}
                                        className="flex-1 p-4 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
                                    >
                                        {isProcessing ? 'Processando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            // DELETE ACCOUNT MODAL - INFO ONLY
                            <div className="space-y-6">
                                <p className="text-sm text-brand-muted dark:text-gray-400 leading-relaxed">
                                    Para deletar a sua conta permanentemente, envie uma mensagem para o administrador com o seu <b>email</b> e <b>senha</b> pedindo para deletar a sua conta.
                                </p>

                                <a
                                    href="https://wa.me/244931534795"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-3 p-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                                >
                                    <MessageCircle size={24} />
                                    Conversar com Administrador
                                </a>

                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="w-full p-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Support Modal */}
            {showSupportModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowSupportModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                                    <Phone size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-brand-dark dark:text-white">Contactar Suporte</h3>
                                    <p className="text-xs text-brand-muted dark:text-gray-400">Escolha uma opção</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSupportModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                                <X size={20} className="text-brand-muted dark:text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-3">
                            {/* WhatsApp Button */}
                            <a
                                href="https://wa.me/244931534795"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all group"
                            >
                                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <MessageCircle size={20} className="text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-bold text-brand-dark dark:text-white">WhatsApp</p>
                                    <p className="text-sm text-green-700 dark:text-green-400 font-mono">+244 931 534 795</p>
                                </div>
                            </a>

                            {/* Copy Number 1 */}
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText('931534795');
                                    alert('📋 Número copiado: 931534795');
                                }}
                                className="w-full flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all group"
                            >
                                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Copy size={20} className="text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-bold text-brand-dark dark:text-white">Copiar Número 1</p>
                                    <p className="text-sm text-blue-700 dark:text-blue-400 font-mono">931 534 795</p>
                                </div>
                            </button>

                            {/* Copy Number 2 */}
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText('951895422');
                                    alert('📋 Número copiado: 951895422');
                                }}
                                className="w-full flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all group"
                            >
                                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Copy size={20} className="text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-bold text-brand-dark dark:text-white">Copiar Número 2</p>
                                    <p className="text-sm text-purple-700 dark:text-purple-400 font-mono">951 895 422</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
