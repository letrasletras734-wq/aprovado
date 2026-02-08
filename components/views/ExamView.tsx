import React, { useState, useEffect } from 'react';
import { OfficialExam, ExamAccessRecord } from '../../types';
import { LatexRenderer } from '../LatexRenderer';
import { Button } from '../Button';
import { ArrowLeft, Clock, Phone, User, FileText, TriangleAlert, CheckCircle, XCircle, MessageCircle } from 'lucide-react';

interface ExamViewProps {
    exam: OfficialExam;
    onBack: () => void;
    onExamStart: (userName: string, userPhone: string) => void;
    onExamFinish: () => void;
    onExamNotFinished: () => void;
    examAccessRecords: ExamAccessRecord[];
    currentUserId: string;
}

const GradientBackground = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 text-white flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-400/30 rounded-full blur-[100px] animate-pulse-slow"></div>
            <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] bg-indigo-400/30 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>
        </div>
        <div className="relative z-10 w-full max-w-md">
            {children}
        </div>
    </div>
);

export const ExamView: React.FC<ExamViewProps> = ({ exam, onBack, onExamStart, onExamFinish, onExamNotFinished, examAccessRecords, currentUserId }) => {
    // Check if user has already accessed this exam
    const existingAccess = examAccessRecords.find(
        record => record.userId === currentUserId && record.examId === exam.id
    );
    const hasAccessed = !!existingAccess;

    // Calculate exam end time based on start time + duration
    const getExamEndTime = () => {
        if (!existingAccess) return null;
        const startTime = new Date(existingAccess.accessedAt);
        const endTime = new Date(startTime.getTime() + exam.timeLimit * 60 * 1000);
        return endTime;
    };

    const examEndTime = getExamEndTime();
    const isExamExpired = examEndTime ? new Date() > examEndTime : false;

    // For first-time users, we need to track start time
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Determine initial step
    const getInitialStep = () => {
        if (!hasAccessed) return 'intro';
        if (isExamExpired) return 'finished';
        return 'exam';
    };

    const [step, setStep] = useState<'intro' | 'exam' | 'finished'>(getInitialStep());
    const [userName, setUserName] = useState(existingAccess?.userName || '');
    const [userPhone, setUserPhone] = useState(existingAccess?.userPhone || '');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [wasUserFinalized, setWasUserFinalized] = useState(existingAccess?.status === 'finished');
    const [wasAutoExpired, setWasAutoExpired] = useState(existingAccess?.status === 'not_finished');

    // Update current time every second to check expiration
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());

            // Check if exam has expired for first-time users
            if (startTime && step === 'exam') {
                const endTime = new Date(startTime.getTime() + exam.timeLimit * 60 * 1000);
                if (new Date() > endTime) {
                    // Auto-expire: mark as not finished
                    if (!wasUserFinalized) {
                        setWasAutoExpired(true);
                        onExamNotFinished();
                    }
                    setStep('finished');
                }
            }

            // Check if exam has expired for returning users
            if (hasAccessed && examEndTime && new Date() > examEndTime && step === 'exam') {
                // Auto-expire: mark as not finished
                if (!wasUserFinalized) {
                    setWasAutoExpired(true);
                    onExamNotFinished();
                }
                setStep('finished');
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [startTime, step, hasAccessed, examEndTime, exam.timeLimit]);

    const handleStart = () => {
        if (!userName.trim() || !userPhone.trim()) {
            alert('Por favor, preencha seu nome e telefone para iniciar.');
            return;
        }
        const now = new Date();
        setStartTime(now);
        onExamStart(userName, userPhone);
        setStep('exam');
    };

    // Format date/time in PT-BR format
    const formatEndDateTime = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} \u00e0s ${hours}h${minutes}`;
    };

    // Get the end time to display
    const getDisplayEndTime = () => {
        if (examEndTime) return examEndTime;
        if (startTime) return new Date(startTime.getTime() + exam.timeLimit * 60 * 1000);
        return null;
    };

    const displayEndTime = getDisplayEndTime();

    if (step === 'intro') {
        return (
            <GradientBackground>
                <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6 font-medium group">
                    <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                        <ArrowLeft size={20} />
                    </div>
                    Voltar
                </button>

                <div className="text-center space-y-4 mb-8">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center mx-auto shadow-xl border border-white/30 animate-float">
                        <FileText size={48} className="text-white drop-shadow-md" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight drop-shadow-sm">{exam.title}</h1>
                        <div className="flex items-center justify-center gap-2 mt-2 text-white/90 font-medium">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs uppercase tracking-wider border border-white/10">Prova Oficial</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs uppercase tracking-wider border border-white/10">{exam.timeLimit} min</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 shadow-2xl space-y-6">
                    <div className="flex items-start gap-4 p-5 bg-amber-500/20 border border-amber-500/30 rounded-2xl">
                        <div className="p-2 bg-amber-500 rounded-xl shadow-lg shrink-0">
                            <TriangleAlert className="text-white" size={20} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-amber-200 text-sm uppercase tracking-wide">Instruções</h3>
                            <ul className="text-xs text-white/90 space-y-1.5 font-medium leading-relaxed">
                                <li className="flex items-start gap-1.5"><span className="mt-1 w-1 h-1 bg-amber-300 rounded-full shrink-0"></span>Resolva em papel.</li>
                                <li className="flex items-start gap-1.5"><span className="mt-1 w-1 h-1 bg-amber-300 rounded-full shrink-0"></span><strong>{exam.timeLimit} minutos</strong> para visualização.</li>
                                <li className="flex items-start gap-1.5"><span className="mt-1 w-1 h-1 bg-amber-300 rounded-full shrink-0"></span>Disponível apenas enquanto ativa.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/80 uppercase ml-2 tracking-wider">Nome Completo</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 group-focus-within:text-white transition-colors" size={20} />
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={e => setUserName(e.target.value)}
                                    placeholder="Seu nome completo"
                                    className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 outline-none focus:bg-black/30 focus:border-white/30 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/80 uppercase ml-2 tracking-wider">WhatsApp</label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 group-focus-within:text-white transition-colors" size={20} />
                                <input
                                    type="tel"
                                    value={userPhone}
                                    onChange={e => setUserPhone(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 outline-none focus:bg-black/30 focus:border-white/30 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <Button onClick={handleStart} className="w-full py-5 text-lg font-black uppercase shadow-xl bg-white text-indigo-600 hover:bg-white/90 hover:scale-[1.02] transition-all rounded-2xl mt-2">
                            Iniciar Prova
                        </Button>
                    </div>
                </div>
            </GradientBackground>
        );
    }

    // Handle user clicking the "Finalizado" button
    const handleFinishClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmFinish = () => {
        setWasUserFinalized(true);
        onExamFinish();
        setShowConfirmModal(false);
        setStep('finished');
    };

    if (step === 'finished') {
        const isFinalized = wasUserFinalized;
        const isNotFinalized = wasAutoExpired || (!wasUserFinalized && (existingAccess?.status === 'not_finished'));

        return (
            <GradientBackground>
                <div className={`w-28 h-28 ${isFinalized ? 'bg-green-500' : 'bg-red-500'} rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl`}>
                    {isFinalized ? (
                        <CheckCircle size={56} className="text-white" />
                    ) : (
                        <XCircle size={56} className="text-white" />
                    )}
                </div>

                <div className="text-center space-y-2 mb-8">
                    <h1 className="text-4xl font-black text-white drop-shadow-md">
                        {isFinalized ? 'Prova Finalizada!' : 'Prova Não Finalizada'}
                    </h1>
                    {displayEndTime && (
                        <p className="text-white/80 text-lg font-medium">
                            {isFinalized ? 'Finalizada' : 'Terminou'} em: {formatEndDateTime(displayEndTime)}
                        </p>
                    )}
                    {isNotFinalized && (
                        <div className="mt-4 p-4 bg-red-500/30 rounded-2xl border border-red-400/50">
                            <p className="text-sm text-red-100 font-medium">
                                ⚠️ Você não marcou a prova como finalizada antes do tempo acabar.
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 shadow-2xl space-y-6 w-full">
                    <p className="text-sm text-white/90 text-center leading-relaxed">
                        {isFinalized
                            ? 'Esperamos que tenha feito uma boa prova. Fique atento aos canais oficiais para o gabarito.'
                            : 'O tempo da prova terminou sem confirmação de finalização. Entre em contato com o professor se necessário.'
                        }
                    </p>

                    <Button variant="secondary" onClick={onBack} className="w-full py-4 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">
                        Voltar ao Início
                    </Button>
                </div>
            </GradientBackground>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col relative">
            {/* Decorative Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 h-[300px] rounded-b-[3rem] shadow-2xl"></div>

            {/* Header com Timer */}
            <header className="relative z-10 p-4 sm:p-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                            <FileText size={24} className="text-white" />
                        </div>
                        <div className="text-white">
                            <h1 className="font-black text-lg sm:text-xl leading-tight drop-shadow-sm">{exam.title}</h1>
                            <div className="flex items-center gap-2 text-xs font-bold opacity-90">
                                <User size={12} /> {userName}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {displayEndTime && (
                            <div className="flex flex-col items-end px-4 py-2 rounded-2xl border backdrop-blur-md shadow-lg bg-white text-indigo-900 border-white/50">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase">Termina em:</span>
                                <span className="font-bold text-sm">{formatEndDateTime(displayEndTime)}</span>
                            </div>
                        )}
                        <button
                            onClick={onBack}
                            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs uppercase transition-all border border-white/20 backdrop-blur-md shadow-lg hover:scale-105"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            {/* Conteúdo da Prova */}
            <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 pb-32 relative z-10">
                <div className="bg-white text-slate-900 p-8 sm:p-12 min-h-[70vh] shadow-2xl rounded-[2rem] border border-slate-100 relative overflow-hidden">
                    {/* Paper Texture/Effect */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50"></div>

                    <div className="prose prose-lg max-w-none text-slate-800 font-serif leading-relaxed">
                        <LatexRenderer content={exam.content} />
                    </div>
                </div>
            </main>

            {/* Botão Finalizado - Fixo no rodapé */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent z-20">
                <div className="max-w-5xl mx-auto">
                    <button
                        onClick={handleFinishClick}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-lg uppercase rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                    >
                        <CheckCircle size={24} />
                        Finalizar Prova
                    </button>
                </div>
            </div>

            {/* Modal de Confirmação */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageCircle size={32} className="text-amber-600" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Confirmar Finalização</h2>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
                            <div className="flex gap-3">
                                <TriangleAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                                <div className="text-sm text-amber-900">
                                    <p className="font-bold mb-2">Importante!</p>
                                    <p>A prova só pode ser marcada como finalizada <strong>após enviar a imagem da prova para o Professor via WhatsApp</strong>.</p>
                                    <p className="mt-2 text-amber-700">Tens certeza que queres finalizar?</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmFinish}
                                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={18} />
                                Sim, Finalizar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
