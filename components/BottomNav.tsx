
import React from 'react';
import { Home, Zap, Users, User, Library, Heart } from 'lucide-react';
import clsx from 'clsx';

interface NavProps {
  currentView: string;
  onChange: (view: string) => void;
}

export const BottomNav: React.FC<NavProps> = ({ currentView, onChange }) => {
  const items = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'contents', icon: Library, label: 'Conteúdos' },
    { id: 'simulado-config', icon: Zap, label: 'Simular' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-brand-green dark:bg-green-900 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] z-50 transition-all duration-300 border-t border-white/10 rounded-t-3xl">
      <div className="flex justify-around items-center h-14 py-1">
        {items.map((item) => {
          const isActive = currentView === item.id || (item.id === 'simulado-config' && currentView.startsWith('simulado'));
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={clsx(
                "flex flex-col items-center justify-center w-12 h-14 rounded-2xl transition-all duration-300",
                isActive
                  ? "bg-white text-brand-green shadow-sm translate-y-0"
                  : "text-green-50 hover:text-white hover:bg-white/10 hover:-translate-y-1"
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {/* Labels are hidden on very small screens or kept minimal for the floating look */}
              {isActive && <span className="text-[8px] font-bold mt-1 animate-fade-in">{item.label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
