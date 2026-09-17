
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import PublicInfoPortal from './PublicInfoPortal';
import InfobarTicker from './InfobarTicker';
import { PoliciaPenalLogo } from './PoliciaPenalLogo';
import { PublicInfo } from '../types';

interface LoginScreenProps {
  onLogin: (name: string, cpf: string) => boolean | string | Promise<boolean | string>;
  publicInfoList: PublicInfo[];
  isLoading?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, publicInfoList, isLoading = false }) => {
  const [loginName, setLoginName] = useState('');
  const [loginCpf, setLoginCpf] = useState('');
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await onLogin(loginName, loginCpf);
      if (result === false) {
        toast.error('Usuário ou senha incorretos!', {
          description: 'Verifique se o CPF/CNPJ (apenas números) ou senha estão corretos.',
          style: { background: '#ef4444', color: '#fff', border: 'none' }
        });
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error('Erro ao conectar ao servidor de login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayInfo = useMemo(() => publicInfoList.filter(info => !info.isConfidential), [publicInfoList]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 relative overflow-hidden">
      {/* Infobar Ticker - Top */}
      <InfobarTicker 
        items={displayInfo} 
        variant="light" 
        label="Avisos Gerais:" 
      />

      <div className="flex-grow flex items-center justify-center p-4 relative">
        <div className="w-full max-w-md p-8 pt-10 space-y-8 bg-[#0b0f19] rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-900/20 relative overflow-hidden">
        
        {/* Portal Button with Policia Penal Logo */}
        <div className="relative">
            <button 
              onClick={() => setIsPortalOpen(true)}
              className="w-full bg-white/5 border border-white/10 hover:border-indigo-400 p-3 rounded-2xl flex items-center gap-3.5 transition-all group"
            >
              <div className="bg-indigo-50/90 p-1.5 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-center flex-shrink-0">
                <PoliciaPenalLogo className="h-9 w-auto object-contain max-w-[36px]" />
              </div>
              <div className="text-left flex-grow">
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-0.5">Portal de Informações</p>
                <p className="text-[9px] font-medium text-slate-300">Atualizações do sistema</p>
              </div>
            </button>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-1 bg-indigo-500 mx-auto rounded-full mb-4"></div>
          <h1 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">GESTÃO DE DADOS P TAIUVA</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            Monitoramento • Gestão 1.Q
          </p>
        </div>
        
        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleLoginSubmit}>
          <div className="space-y-4">
              <input 
                  type="text"
                  autoComplete="username"
                  required 
                  value={loginName} 
                  onChange={(e) => setLoginName(e.target.value.toUpperCase())} 
                  placeholder="NOME OU SETOR" 
                  className="w-full h-14 px-6 bg-white/5 border border-white/10 placeholder-slate-500 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-sm"
                />
              <input 
                  type="password" 
                  autoComplete="current-password"
                  required 
                  value={loginCpf} 
                  onChange={(e) => setLoginCpf(e.target.value)}
                  placeholder="CHAVE DE ACESSO" 
                  className="w-full h-14 px-6 bg-white/5 border border-white/10 placeholder-slate-500 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-sm"
                />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || isSubmitting}
            className={`w-full h-14 text-sm font-black rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 transition-all uppercase tracking-widest mt-4 flex items-center justify-center gap-2 ${(isLoading || isSubmitting) ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verificando acesso...</span>
                </>
              ) : isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sincronizando acessos...</span>
                </>
              ) : (
                "Entrar no Painel"
              )}
          </button>
        </form>

        <div className="text-center">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                TAIÚVA/SP • 2026
            </p>
        </div>
      </div>
    </div>

      <PublicInfoPortal 
        isOpen={isPortalOpen} 
        onClose={() => setIsPortalOpen(false)} 
        infoList={publicInfoList} 
      />
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default LoginScreen;
