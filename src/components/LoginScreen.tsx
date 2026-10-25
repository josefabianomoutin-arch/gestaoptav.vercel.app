
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import PublicInfoPortal from './PublicInfoPortal';
import InfobarTicker from './InfobarTicker';
import { PublicInfo } from '../types';

interface LoginScreenProps {
  onLogin: (name: string, cpf: string) => boolean | string | Promise<boolean | string>;
  publicInfoList: PublicInfo[];
  isLoading?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, publicInfoList, isLoading: _isLoading = false }) => {
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
          description: 'Verifique se o usuário (nome, setor ou CPF/CNPJ) e a senha/chave de acesso estão corretos.',
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
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-white selection:bg-indigo-500 selection:text-white">
      {/* Infobar Ticker - Top */}
      <div className="relative z-10">
        <InfobarTicker 
          items={displayInfo} 
          variant="light" 
          label="Avisos Gerais:" 
        />
      </div>

      <div className="flex-grow flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md p-8 pt-8 space-y-6 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        
        {/* Environment Badge */}
        <div className="flex justify-center">
          <span 
            style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-wider shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Portal Online • Produtores & Fornecedores
          </span>
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 
            style={{ color: '#0f172a' }}
            className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight"
          >
            PENITENCIÁRIA DE TAIÚVA
          </h1>
          <p 
            style={{ color: '#4f46e5' }}
            className="text-[11px] font-bold text-indigo-600 uppercase tracking-[0.25em]"
          >
            GESTÃO DE DADOS & ESTOQUE
          </p>
          <p 
            style={{ color: '#94a3b8' }}
            className="text-[9px] text-slate-400 uppercase tracking-widest font-medium"
          >
            Agendamentos • Envio de Notas • Per Capita
          </p>
        </div>

        {/* Portal Button */}
        <div className="relative">
            <button 
              type="button"
              onClick={() => setIsPortalOpen(true)}
              style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
              className="w-full bg-slate-50 border border-slate-200 hover:border-indigo-400 p-3 rounded-2xl flex items-center gap-3.5 transition-all group shadow-sm cursor-pointer"
            >
              <div 
                style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', color: '#4f46e5' }}
                className="bg-indigo-50 p-2 rounded-2xl border border-indigo-200 shadow-sm flex items-center justify-center flex-shrink-0 text-indigo-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left flex-grow">
                <p 
                  style={{ color: '#312e81' }}
                  className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest mb-0.5"
                >
                  Portal de Informações
                </p>
                <p 
                  style={{ color: '#64748b' }}
                  className="text-[9px] font-medium text-slate-500"
                >
                  Penitenciária de Taiúva • Editais e Comunicados
                </p>
              </div>
            </button>
        </div>
        
        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleLoginSubmit}>
          <div className="space-y-3">
              <input 
                  type="text"
                  autoComplete="username"
                  required 
                  value={loginName} 
                  onChange={(e) => setLoginName(e.target.value)} 
                  placeholder="USUÁRIO, NOME OU CPF/CNPJ" 
                  style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' }}
                  className="w-full h-14 px-6 bg-slate-50 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-sm uppercase shadow-sm"
                />
              <input 
                  type="password" 
                  autoComplete="current-password"
                  required 
                  value={loginCpf} 
                  onChange={(e) => setLoginCpf(e.target.value)}
                  placeholder="SENHA OU CHAVE DE ACESSO" 
                  style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' }}
                  className="w-full h-14 px-6 bg-slate-50 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-sm shadow-sm"
                />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              backgroundColor: '#4f46e5', 
              color: '#ffffff', 
              borderColor: '#4338ca',
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
            className={`w-full h-14 text-sm font-black rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 shadow-lg shadow-indigo-600/30 transition-all uppercase tracking-widest mt-4 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verificando acesso...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
          </button>
        </form>
        <div className="text-center pt-2">
            <p 
              style={{ color: '#94a3b8' }}
              className="text-[9px] text-slate-400 font-bold uppercase tracking-widest"
            >
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
