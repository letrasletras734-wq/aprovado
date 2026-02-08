
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MOCK_TOPIC_TREE } from '../../constants';
import { ContentItem, TopicNode, AdminSummary, UserStats, AdminMaterial } from '../../types';
import { Button } from '../Button';
import {
  Folder, FileText, ChevronDown, ChevronRight, ArrowLeft, X, Search, Zap, UserCheck, Calendar, Bookmark, Heart, Trophy, Lock
} from 'lucide-react';
import { LatexRenderer } from '../LatexRenderer';

interface ContentsViewProps {
  contents: ContentItem[];
  adminSummaries: AdminSummary[];
  adminMaterials: AdminMaterial[];
  topicTree: TopicNode;
  userStats: UserStats;
  isUserVip?: boolean;
  onUpdateStats: (stats: UserStats) => void;
  onToggleFavorite?: (itemId: string, itemType: 'summary' | 'topic', currentlyFavorite: boolean) => void;
  onToggleRead?: (itemId: string, itemType: 'summary' | 'topic', currentlyRead: boolean) => void;
}

const getLevelStyle = (level: number) => {
  const styles = [
    { border: 'border-l-gray-500', text: 'text-gray-700 dark:text-white', icon: 'text-gray-500 dark:text-gray-400', bgOpen: 'bg-gray-100 dark:bg-gray-800' },
    { border: 'border-l-purple-600 dark:border-l-purple-500', text: 'text-purple-700 dark:text-white', icon: 'text-purple-600 dark:text-purple-400', bgOpen: 'bg-purple-50 dark:bg-purple-900/20' },
    { border: 'border-l-blue-600 dark:border-l-blue-500', text: 'text-blue-700 dark:text-white', icon: 'text-blue-600 dark:text-blue-400', bgOpen: 'bg-blue-50 dark:bg-blue-900/20' },
    { border: 'border-l-green-600 dark:border-l-green-500', text: 'text-green-700 dark:text-white', icon: 'text-green-600 dark:text-green-400', bgOpen: 'bg-green-50 dark:bg-green-900/20' }
  ];
  return styles[Math.min(level, styles.length - 1)];
};

const VerticalTreeNode: React.FC<{
  node: TopicNode;
  level?: number;
  onOpenContent: (node: TopicNode) => void;
  forceExpand?: boolean;
  isFavorite: boolean;
  isRead: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleRead: (id: string) => void;
  userStats: UserStats;
}> = ({
  node, level = 0, onOpenContent, forceExpand = false, isFavorite, isRead, onToggleFavorite, onToggleRead, userStats
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = node.children && node.children.length > 0;
    const isLeaf = node.type === 'file';

    useEffect(() => {
      if (forceExpand && hasChildren) setIsOpen(true);
      else if (!forceExpand && level > 0) setIsOpen(false);
    }, [forceExpand, hasChildren, level]);

    const style = getLevelStyle(level);

    return (
      <div className="w-full">
        <div
          onClick={() => isLeaf ? onOpenContent(node) : setIsOpen(!isOpen)}
          className={`flex items-center gap-3 p-4 cursor-pointer transition-all ${level === 0
            ? 'border-0' // Sem borda quando é raiz (disciplina principal)
            : `border-b border-gray-100 dark:border-gray-800 border-l-[6px] ${style.border}`
            } ${isOpen && !isLeaf && level > 0 ? style.bgOpen : level === 0 ? '' : 'bg-white dark:bg-gray-800'}`}
        >
          <div className={`flex-shrink-0 ${isLeaf ? 'text-blue-500' : (isOpen ? style.icon : level === 0 ? 'text-brand-purple' : 'text-gray-400')}`}>
            {isLeaf ? <FileText size={20} /> : (isOpen ? <Folder size={20} fill="currentColor" /> : <Folder size={20} />)}
          </div>
          <span className={`flex-1 font-bold text-sm ${level === 0
            ? 'text-brand-purple text-base' // Destaque para disciplinas principais
            : isOpen || isLeaf ? style.text : 'text-brand-dark dark:text-white'
            }`}>
            {node.title}
          </span>
          {isLeaf && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleRead(node.id); }}
                className={`p-1.5 rounded-lg transition-all ${isRead ? 'text-brand-green bg-brand-green/10' : 'text-gray-300 hover:text-gray-400'}`}
              >
                <UserCheck size={16} fill={isRead ? "currentColor" : "none"} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(node.id); }}
                className={`p-1.5 rounded-lg transition-all ${isFavorite ? 'text-red-500 bg-red-500/10' : 'text-gray-300 hover:text-red-400'}`}
              >
                <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
          )}
          {!isLeaf && (
            <div className={`transition-transform duration-200 ${isOpen ? style.icon : level === 0 ? 'text-brand-purple' : 'text-gray-300'}`}>
              {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>
          )}
        </div>
        {isOpen && hasChildren && !isLeaf && node.children!.map((child) => (
          <VerticalTreeNode
            key={child.id}
            node={child}
            level={level + 1}
            onOpenContent={onOpenContent}
            forceExpand={forceExpand}
            isFavorite={userStats.favoriteTopics?.includes(child.id) || false}
            isRead={userStats.readTopics?.includes(child.id) || false}
            onToggleFavorite={onToggleFavorite}
            onToggleRead={onToggleRead}
            userStats={userStats}
          />
        ))}
      </div>
    );
  };

const FullScreenReader = ({ title, content, subtitle, isSummary, imageUrl, onClose }: { title: string, content: string, subtitle: string, isSummary: boolean, imageUrl?: string, onClose: () => void }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-gray-900/50 flex items-center justify-center">
      <div className="w-full max-w-md h-full bg-white dark:bg-gray-900 flex flex-col animate-fade-in shadow-2xl">
        <header className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm sticky top-0 ${isSummary ? 'bg-orange-50/95 dark:bg-orange-900/20' : 'bg-white/95 dark:bg-gray-900/95'}`}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} className="!p-2 -ml-2"><ArrowLeft size={24} className="text-brand-dark dark:text-white" /></Button>
            <div className="flex flex-col overflow-hidden">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isSummary ? 'text-orange-600 dark:text-orange-400' : 'text-brand-muted dark:text-gray-400'}`}>
                {subtitle}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-brand-dark dark:text-white leading-tight break-words">{title}</h2>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="!p-2 text-brand-muted hover:text-red-500"><X size={24} /></Button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {imageUrl && (
            <div className="mb-6 rounded-3xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800">
              <img src={imageUrl} alt={title} className="w-full h-auto object-cover" />
            </div>
          )}
          {isSummary && (
            <div className="mb-8 p-4 bg-orange-100 dark:bg-orange-900/30 border-l-4 border-orange-500 rounded-r-xl flex gap-3 items-center">
              <Zap className="text-orange-600 dark:text-orange-400 flex-shrink-0" size={24} />
              <p className="text-sm font-bold text-orange-800 dark:text-orange-200">Publicação Oficial</p>
            </div>
          )}
          <article className="text-brand-dark dark:text-gray-300">
            <div className="max-w-2xl mx-auto">
              <LatexRenderer content={content} />
            </div>
          </article>
          <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-center pb-10">
            <Button onClick={onClose} className={`px-8 py-3 ${isSummary ? 'bg-orange-500 hover:bg-orange-600' : ''}`}>Concluir Leitura</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const ContentsView: React.FC<ContentsViewProps> = ({ adminSummaries, adminMaterials, topicTree, userStats, isUserVip = false, onUpdateStats, onToggleFavorite, onToggleRead }) => {
  const [readingItem, setReadingItem] = useState<{ title: string, content: string, subtitle: string, isSummary: boolean, imageUrl?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'summaries' | 'materials' | 'favorites'>('summaries');
  const [showVipModal, setShowVipModal] = useState(false);

  const toggleFavoriteSummary = (id: string) => {
    const currentFavorites = userStats.favoriteSummaries || [];
    const isFavorite = currentFavorites.includes(id);
    if (onToggleFavorite) {
      onToggleFavorite(id, 'summary', isFavorite);
    } else {
      const newFavorites = isFavorite ? currentFavorites.filter(fid => fid !== id) : [...currentFavorites, id];
      onUpdateStats({ ...userStats, favoriteSummaries: newFavorites });
    }
  };

  const toggleReadSummary = (id: string) => {
    const currentRead = userStats.readSummaries || [];
    const isRead = currentRead.includes(id);
    if (onToggleRead) {
      onToggleRead(id, 'summary', isRead);
    } else {
      const newRead = isRead ? currentRead.filter(rid => rid !== id) : [...currentRead, id];
      onUpdateStats({ ...userStats, readSummaries: newRead });
    }
  };

  const toggleFavoriteTopic = (id: string) => {
    const currentFavorites = userStats.favoriteTopics || [];
    const isFavorite = currentFavorites.includes(id);
    if (onToggleFavorite) {
      onToggleFavorite(id, 'topic', isFavorite);
    } else {
      const newFavorites = isFavorite ? currentFavorites.filter(fid => fid !== id) : [...currentFavorites, id];
      onUpdateStats({ ...userStats, favoriteTopics: newFavorites });
    }
  };

  const toggleReadTopic = (id: string) => {
    const currentRead = userStats.readTopics || [];
    const isRead = currentRead.includes(id);
    if (onToggleRead) {
      onToggleRead(id, 'topic', isRead);
    } else {
      const newRead = isRead ? currentRead.filter(rid => rid !== id) : [...currentRead, id];
      onUpdateStats({ ...userStats, readTopics: newRead });
    }
  };

  const filterTree = (node: TopicNode, query: string): TopicNode | null => {
    const lowerQuery = query.toLowerCase();
    const matchesSearch = node.title.toLowerCase().includes(lowerQuery) || (node.content && node.content.toLowerCase().includes(lowerQuery));
    if (node.type === 'file') return matchesSearch ? node : null;
    let filteredChildren: TopicNode[] = [];
    if (node.children) {
      filteredChildren = node.children.map(child => filterTree(child, query)).filter((child): child is TopicNode => child !== null);
    }
    if (matchesSearch || filteredChildren.length > 0) return { ...node, children: filteredChildren };
    return null;
  };

  const displayedTree = useMemo(() => filterTree(topicTree, searchQuery), [searchQuery, topicTree]);

  const filteredAdminSummaries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return adminSummaries.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.category.toLowerCase().includes(query) ||
      s.content.toLowerCase().includes(query)
    );
  }, [searchQuery, adminSummaries]);

  const filteredAdminMaterials = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return adminMaterials.filter(m =>
      m.title.toLowerCase().includes(query) ||
      (m.description && m.description.toLowerCase().includes(query))
    );
  }, [searchQuery, adminMaterials]);

  if (readingItem) {
    return <FullScreenReader {...readingItem} onClose={() => setReadingItem(null)} />;
  }

  // VIP Upgrade Modal
  const VipModal = () => createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowVipModal(false)}>
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-amber-500/20" onClick={(e) => e.stopPropagation()}>
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Trophy size={40} className="text-white" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">Conteúdo VIP</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Este conteúdo é exclusivo para membros VIP. Faça upgrade da sua conta para ter acesso ilimitado a todo conteúdo premium!
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

  return (
    <div className="space-y-4 min-h-screen bg-[#F0F0F7] dark:bg-gray-900 transition-colors">
      {showVipModal && <VipModal />}
      <header className="flex flex-col gap-3 py-2 px-4 sticky top-0 bg-[#F0F0F7]/95 dark:bg-gray-900/95 z-20 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-brand-dark dark:text-white">Central de Estudos</h1>
          <div className="flex items-center gap-1.5 text-[9px] font-black bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full uppercase tracking-tight">
            <UserCheck size={11} /> Mentor Online
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-purple">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-3 border-none rounded-2xl bg-white dark:bg-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 shadow-sm text-brand-dark dark:text-white transition-all"
            placeholder={filterMode === 'summaries' ? "Pesquisar nos Resumos..." : "Buscar matérias e disciplinas..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex p-1.5 bg-gray-200 dark:bg-gray-800 rounded-2xl">
          <button
            onClick={() => setFilterMode('summaries')}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${filterMode === 'summaries' ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-md scale-[1.02]' : 'text-brand-muted dark:text-gray-400 hover:text-brand-dark'}`}
          >
            <Zap size={16} fill={filterMode === 'summaries' ? "currentColor" : "none"} />
            Resumos
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${filterMode === 'all' ? 'bg-white dark:bg-gray-700 text-brand-purple shadow-md scale-[1.02]' : 'text-brand-muted dark:text-gray-400 hover:text-brand-dark'}`}
          >
            <Bookmark size={16} fill={filterMode === 'all' ? "currentColor" : "none"} />
            Matérias
          </button>
          <button
            onClick={() => setFilterMode('materials')}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${filterMode === 'materials' ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-md scale-[1.02]' : 'text-brand-muted dark:text-gray-400 hover:text-brand-dark'}`}
          >
            <Folder size={16} fill={filterMode === 'materials' ? "currentColor" : "none"} />
            Materiais
          </button>
          <button
            onClick={() => setFilterMode('favorites')}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${filterMode === 'favorites' ? 'bg-white dark:bg-gray-700 text-red-500 shadow-md scale-[1.02]' : 'text-brand-muted dark:text-gray-400 hover:text-brand-dark'}`}
          >
            <Heart size={16} fill={filterMode === 'favorites' ? "currentColor" : "none"} />
            Favoritos
          </button>
        </div>
      </header>

      <main className="px-0">
        {filterMode === 'summaries' ? (
          <div className="px-4 space-y-4 animate-fade-in">
            {filteredAdminSummaries.length > 0 ? (
              filteredAdminSummaries.map((summary) => {
                const isRead = userStats.readSummaries?.includes(summary.id);
                return (
                  <article
                    key={summary.id}
                    onClick={() => {
                      // Check if summary is VIP and user is not VIP
                      if (summary.isVip && !isUserVip) {
                        setShowVipModal(true);
                        return;
                      }
                      setReadingItem({ title: summary.title, content: summary.content, subtitle: 'Publicação Oficial', isSummary: true, imageUrl: summary.imageUrl });
                      if (!userStats.readSummaries?.includes(summary.id)) toggleReadSummary(summary.id);
                    }}
                    className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-neu border border-transparent group cursor-pointer active:scale-[0.98] transition-all hover:shadow-lg hover:border-orange-500/30"
                  >
                    {summary.imageUrl && (
                      <div className="w-full h-32 overflow-hidden relative">
                        <img src={summary.imageUrl} alt={summary.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleReadSummary(summary.id); }}
                            className={`p-1.5 rounded-lg backdrop-blur-md transition-all ${userStats.readSummaries?.includes(summary.id) ? 'bg-brand-green text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
                          >
                            <UserCheck size={16} fill={userStats.readSummaries?.includes(summary.id) ? "currentColor" : "none"} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavoriteSummary(summary.id); }}
                            className={`p-1.5 rounded-lg backdrop-blur-md transition-all ${userStats.favoriteSummaries?.includes(summary.id) ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
                          >
                            <Heart size={16} fill={userStats.favoriteSummaries?.includes(summary.id) ? "currentColor" : "none"} />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-lg uppercase">
                            {summary.category}
                          </span>
                          {summary.isVip && <Trophy size={12} className="text-amber-500" />}
                        </div>
                        <div className="flex gap-1.5">
                          {!summary.imageUrl && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleReadSummary(summary.id); }}
                                className={`p-1 rounded-md transition-all ${userStats.readSummaries?.includes(summary.id) ? 'text-brand-green bg-brand-green/10' : 'text-gray-300 hover:text-gray-400'}`}
                              >
                                <UserCheck size={14} fill={userStats.readSummaries?.includes(summary.id) ? "currentColor" : "none"} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFavoriteSummary(summary.id); }}
                                className={`p-1 rounded-md transition-all ${userStats.favoriteSummaries?.includes(summary.id) ? 'text-red-500 bg-red-500/10' : 'text-gray-300 hover:text-red-400'}`}
                              >
                                <Heart size={14} fill={userStats.favoriteSummaries?.includes(summary.id) ? "currentColor" : "none"} />
                              </button>
                            </>
                          )}
                          {summary.isNew && !userStats.readSummaries?.includes(summary.id) && <span className="flex items-center gap-1 text-[8px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded-full animate-pulse">NOVO</span>}
                        </div>
                      </div>
                      <h3 className="font-bold text-brand-dark dark:text-white group-hover:text-orange-600 transition-colors text-sm leading-tight">
                        {summary.title}
                      </h3>
                      <div className="text-[11px] text-brand-muted dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed opacity-80">
                        <LatexRenderer content={summary.content} previewMode={true} />
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                        <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-medium">
                          <Calendar size={10} /> {summary.date}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                          Ler Resumo <ChevronRight size={12} />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="py-20 text-center flex flex-col items-center">
                <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 text-gray-300">
                  <Search size={40} />
                </div>
                <p className="text-brand-muted dark:text-gray-500 text-sm font-medium">Nada encontrado para "{searchQuery}"</p>
                <Button variant="ghost" className="mt-2 text-xs text-brand-purple" onClick={() => setSearchQuery('')}>Limpar busca</Button>
              </div>
            )}
          </div>
        ) : filterMode === 'all' ? (
          <div className="px-4 space-y-3 animate-fade-in">
            {displayedTree && displayedTree.children && displayedTree.children.length > 0 ? (
              displayedTree.children.map((disciplineNode) => (
                <div key={disciplineNode.id} className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-neu border border-transparent hover:border-brand-purple/30 transition-all">
                  <VerticalTreeNode
                    node={disciplineNode}
                    level={0}
                    onOpenContent={(node) => {
                      // Check if topic is VIP and user is not VIP
                      if (node.isVip && !isUserVip) {
                        setShowVipModal(true);
                        return;
                      }
                      setReadingItem({ title: node.title, content: node.content || '', subtitle: 'Base Teórica', isSummary: false });
                      if (!userStats.readTopics?.includes(node.id)) toggleReadTopic(node.id);
                    }}
                    forceExpand={!!searchQuery.trim()}
                    isFavorite={userStats.favoriteTopics?.includes(disciplineNode.id) || false}
                    isRead={userStats.readTopics?.includes(disciplineNode.id) || false}
                    onToggleFavorite={toggleFavoriteTopic}
                    onToggleRead={toggleReadTopic}
                    userStats={userStats}
                  />
                </div>
              ))
            ) : (
              <div className="py-20 text-center flex flex-col items-center">
                <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 text-gray-300">
                  <Search size={40} />
                </div>
                <p className="text-brand-muted dark:text-gray-500 text-sm font-medium">Nenhuma matéria encontrada.</p>
                <Button variant="ghost" className="mt-2 text-xs text-brand-purple" onClick={() => setSearchQuery('')}>Limpar busca</Button>
              </div>
            )}
          </div>
        ) : filterMode === 'materials' ? (
          <div className="px-4 space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredAdminMaterials.length > 0 ? (
                filteredAdminMaterials.map((mat) => (
                  <div key={mat.id} className="bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden shadow-neu border border-transparent hover:border-blue-500/30 transition-all group">
                    {mat.coverUrl && (
                      <div className="h-40 w-full overflow-hidden relative">
                        <img src={mat.coverUrl} alt={mat.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                    <div className="p-5 space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-brand-dark dark:text-white text-base leading-tight">{mat.title}</h3>
                          {mat.isVip && <Trophy size={14} className="text-amber-500" />}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{mat.date}</p>
                      </div>
                      {mat.description && (
                        <p className="text-xs text-brand-muted dark:text-gray-400 line-clamp-2 leading-relaxed opacity-80">
                          {mat.description}
                        </p>
                      )}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Check if material is VIP and user is not VIP
                          if (mat.isVip && !isUserVip) {
                            setShowVipModal(true);
                            return;
                          }
                          window.open(mat.downloadUrl, '_blank');
                        }}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 border-none rounded-2xl font-black uppercase text-[11px] shadow-lg flex items-center justify-center gap-2"
                      >
                        <Folder size={16} /> Baixar Material
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 py-20 text-center flex flex-col items-center">
                  <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 text-gray-300">
                    <Folder size={40} />
                  </div>
                  <p className="text-brand-muted dark:text-gray-500 text-sm font-medium">Nenhum material encontrado.</p>
                  <Button variant="ghost" className="mt-2 text-xs text-brand-purple" onClick={() => setSearchQuery('')}>Limpar busca</Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in px-4">
            <div className="space-y-4">
              <h2 className="text-sm font-black text-brand-muted dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Zap size={14} /> Resumos Favoritos ({userStats.favoriteSummaries?.length || 0})
              </h2>
              {adminSummaries.filter(s => userStats.favoriteSummaries?.includes(s.id)).length > 0 ? (
                adminSummaries.filter(s => userStats.favoriteSummaries?.includes(s.id)).map(summary => (
                  <article
                    key={summary.id}
                    onClick={() => setReadingItem({ title: summary.title, content: summary.content, subtitle: 'Publicação Oficial', isSummary: true, imageUrl: summary.imageUrl })}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-neu border border-transparent flex items-center gap-4 cursor-pointer hover:border-orange-500/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center flex-shrink-0">
                      <Zap size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-brand-dark dark:text-white">{summary.title}</h4>
                      <p className="text-[10px] text-brand-muted dark:text-gray-400 uppercase font-bold">{summary.category}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavoriteSummary(summary.id); }}
                      className="p-2 rounded-xl bg-red-500/10 text-red-500"
                    >
                      <Heart size={18} fill="currentColor" />
                    </button>
                  </article>
                ))
              ) : (
                <p className="text-xs text-brand-muted dark:text-gray-500 italic py-4">Nenhum resumo favoritado.</p>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-black text-brand-muted dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Bookmark size={14} /> Matérias Favoritas ({userStats.favoriteTopics?.length || 0})
              </h2>
              {userStats.favoriteTopics?.length > 0 ? (
                userStats.favoriteTopics.map(id => {
                  const findTopic = (node: TopicNode, tid: string): TopicNode | null => {
                    if (node.id === tid) return node;
                    if (node.children) {
                      for (const child of node.children) {
                        const found = findTopic(child, tid);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  const topic = findTopic(topicTree, id);
                  if (!topic) return null;
                  return (
                    <div
                      key={topic.id}
                      onClick={() => setReadingItem({ title: topic.title, content: topic.content || '', subtitle: 'Base Teórica', isSummary: false })}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-neu cursor-pointer hover:border-brand-purple/30 border border-transparent transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand-purple/10 text-brand-purple flex items-center justify-center">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-brand-dark dark:text-white">{topic.title}</h4>
                        <p className="text-[10px] text-brand-muted dark:text-gray-400 uppercase font-bold">Matéria Teórica</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavoriteTopic(topic.id); }}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500"
                      >
                        <Heart size={18} fill="currentColor" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-brand-muted dark:text-gray-500 italic py-4">Nenhuma matéria favoritada.</p>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="px-6 py-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
          <span className="text-[10px] font-bold text-brand-muted dark:text-gray-400 uppercase tracking-widest">
            {filterMode === 'summaries' ? 'Conteúdo Atualizado' : 'Biblioteca de Matérias'}
          </span>
        </div>
      </footer>
    </div>
  );
};
