
import React from 'react';
import { RankingUser, UserAccount } from '../../types';
import { Button } from '../Button';
import { ArrowLeft, Trophy, Target, XCircle, CheckCircle } from 'lucide-react';

interface Props {
  rankingList: RankingUser[];
  onBack: () => void;
  currentUser: UserAccount | null;
}

export const RankingDetail: React.FC<Props> = ({ rankingList, onBack, currentUser }) => {
  return (
    <div className="space-y-6 animate-fade-in min-h-screen bg-[#F0F0F7] dark:bg-gray-900">
      <header className="flex items-center gap-4 py-2 sticky top-0 bg-[#F0F0F7]/90 dark:bg-gray-900/90 backdrop-blur-sm z-10 px-1">
        <Button variant="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold text-brand-dark dark:text-white">Ranking Semanal</h1>
      </header>

      <div className="space-y-2 px-1">
        {rankingList.map((user, index) => {
          const isMe = currentUser && user.id === currentUser.id;
          const rank = index + 1;

          // Calculando estatísticas estimadas baseadas na precisão e total
          const correctCount = Math.round((user.questionsSolved * user.accuracy) / 100);
          const wrongCount = user.questionsSolved - correctCount;

          let rankColor = "bg-white dark:bg-gray-800 text-brand-dark dark:text-white";
          let numColor = "text-brand-muted dark:text-gray-500";
          let icon = null;

          if (rank === 1) {
            rankColor = "bg-gradient-to-r from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 border-green-300 dark:border-green-800";
            numColor = "text-green-500";
            icon = <Trophy size={16} className="text-green-500" fill="currentColor" />;
          } else if (rank === 2) {
            rankColor = "bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 border-blue-200 dark:border-blue-800";
            numColor = "text-blue-500";
            icon = <Trophy size={14} className="text-blue-500" />;
          } else if (rank === 3) {
            rankColor = "bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-900/20 dark:to-gray-800 border-yellow-200 dark:border-yellow-800";
            numColor = "text-yellow-500";
            icon = <Trophy size={14} className="text-yellow-500" />;
          }

          if (isMe) {
            rankColor = "bg-brand-green/10 border-brand-green dark:bg-green-900/20 dark:border-green-800";
          }

          return (
            <div
              key={user.id}
              className={`rounded-xl p-3 shadow-sm border ${isMe ? 'border-brand-green' : 'border-transparent'} ${rankColor} relative overflow-hidden`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center font-black text-sm rounded-lg bg-white dark:bg-gray-700 shadow-sm ${numColor}`}>
                  {rank}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className={`font-bold text-sm truncate ${isMe ? 'text-brand-green-dark dark:text-green-400' : 'text-brand-dark dark:text-white'}`}>
                      {user.name} {isMe && '(Você)'}
                    </h3>
                    {icon}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-brand-muted dark:text-gray-400 font-medium mt-0.5">
                    <span className="flex items-center gap-1">
                      <CheckCircle size={10} className="text-green-500" />
                      {correctCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle size={10} className="text-red-400" />
                      {wrongCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target size={10} className="text-blue-500" />
                      {user.accuracy}%
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-base font-black text-brand-purple">
                    {user.score.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-brand-muted uppercase font-bold">pts</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
