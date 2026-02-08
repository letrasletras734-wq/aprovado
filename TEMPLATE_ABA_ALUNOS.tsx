// Adicione esta seção no AdminPanel.tsx onde as outras abas são renderizadas

{/* Aba de Alunos - Gerenciar Pontos */ }
{
    activeTab === 'users' && (
        <div className="space-y-6 animate-page-enter">
            <section className="glass-card rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Users size={100} /></div>
                <h2 className="text-xl font-bold mb-2">👥 Gerenciar Alunos</h2>
                <p className="text-xs text-slate-400 max-w-md mb-6">
                    Adicione ou remova pontos de provas oficiais para testar o sistema de níveis.
                </p>

                <div className="grid grid-cols-1 gap-4">
                    {users.filter(u => u.role === 'user').map(user => {
                        const [pointsInput, setPointsInput] = React.useState('');
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

                                <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            value={pointsInput}
                                            onChange={e => setPointsInput(e.target.value)}
                                            placeholder="Ex: +50 ou -20"
                                            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        <button
                                            onClick={() => {
                                                const points = parseInt(pointsInput);
                                                if (!isNaN(points)) {
                                                    onUpdateUserPoints(user.id, points);
                                                    setPointsInput('');
                                                    alert(`✅ ${points > 0 ? 'Adicionados' : 'Removidos'} ${Math.abs(points)} pontos ${points > 0 ? 'a' : 'de'} ${user.name}`);
                                                }
                                            }}
                                            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition-all"
                                        >
                                            Atualizar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        {[50, 100, 200, 500, 1000, -50].map(quick => (
                                            <button
                                                key={quick}
                                                onClick={() => {
                                                    onUpdateUserPoints(user.id, quick);
                                                    alert(`✅ ${quick > 0 ? '+' : ''}${quick} pontos para ${user.name}`);
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
                            </div>
                        );
                    })}

                    {users.filter(u => u.role === 'user').length === 0 && (
                        <p className="text-slate-500 text-center py-8">Nenhum aluno cadastrado ainda.</p>
                    )}
                </div>
            </section>
        </div>
    )
}
