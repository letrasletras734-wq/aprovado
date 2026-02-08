import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  active = false,
  className = '', 
  ...props 
}) => {
  
  const baseClasses = "transition-all duration-200 font-medium rounded-xl flex items-center justify-center outline-none focus:ring-2 focus:ring-brand-purple/50";
  
  const variants = {
    primary: "bg-brand-purple text-white shadow-lg hover:bg-opacity-90 active:scale-95",
    secondary: `bg-brand-light text-brand-dark ${active ? 'shadow-neu-inset text-brand-purple' : 'shadow-neu hover:-translate-y-0.5'}`,
    ghost: "bg-transparent text-brand-muted hover:text-brand-purple",
    icon: `p-3 rounded-full bg-brand-light text-brand-muted ${active ? 'shadow-neu-inset text-brand-purple' : 'shadow-neu'}`
  };

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};