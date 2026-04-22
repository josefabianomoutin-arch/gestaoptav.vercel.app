
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import PublicInfoPortal from './PublicInfoPortal';
import InfobarTicker from './InfobarTicker';
import { PublicInfo } from '../types';

interface LoginScreenProps {
  onLogin: (name: string, cpf: string) => boolean;
  publicInfoList: PublicInfo[];
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, publicInfoList }) => {
  const [loginName, setLoginName] = useState('');
  const [loginCpf, setLoginCpf] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPortalOpen, setIsPortalOpen] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLogin(loginName, loginCpf)) {
      setLoginError('Dados de acesso incorretos. Verifique o nome e a senha.');
    } else {
      setLoginError('');
    }
  };

  const isStringLogin = useMemo(() => {
    const nameTrimmed = loginName.trim().toUpperCase();
    return ['ITESP', 'ALMOXARIFADO', 'ALMOX', 'FINANCEIRO', 'SUBPORTARIA', 'INFRAESTRUTURA', 'ORDEM DE SAIDA', 'SEÇÃO DE INFRAESTRUTURA E LOGÍSTICA', 'ORDEM DE SERVIÇO'].includes(nameTrimmed);
  }, [loginName]);

  const passwordPlaceholder = useMemo(() => {
    if (isStringLogin) return "Senha do Setor";
    const name = loginName.trim().toUpperCase();
    if (['ADMINISTRADOR', 'ADM', 'DOUGLAS', 'GALDINO'].some(n => name.includes(n))) return "Senha do Admin";
    return "Senha (CPF ou CNPJ)";
  }, [loginName, isStringLogin]);

  const isAbrilVerde = new Date().getMonth() === 3; // April is index 3

  const displayInfo = useMemo(() => publicInfoList.filter(info => !info.isConfidential), [publicInfoList]);

  return (
    <div className={`min-h-screen flex flex-col bg-slate-950 relative overflow-hidden`}>
      {/* Infobar Ticker - Top */}
      <InfobarTicker 
        items={displayInfo} 
        variant="dark" 
        label="Avisos Gerais:" 
      />

      <div className="flex-grow flex items-center justify-center p-4 relative">
        {/* Background Decor */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/40 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/40 blur-[120px] rounded-full"></div>
        
        <div className="w-full max-w-md p-8 pt-10 space-y-8 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Portal Button */}
        <div className="relative">
            <button 
              onClick={() => setIsPortalOpen(true)}
              className="w-full bg-white/5 border border-white/10 hover:border-indigo-400 p-4 rounded-2xl flex items-center gap-4 transition-all group"
            >
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
                  type={showPassword ? "text" : "password"} 
                  autoComplete="current-password"
                  required 
                  value={loginCpf} 
                  onChange={(e) => setLoginCpf(e.target.value)}
                  placeholder="CHAVE DE ACESSO" 
                  className="w-full h-14 px-6 bg-white/5 border border-white/10 placeholder-slate-500 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-sm"
                />
          </div>

          <button type="submit" className="w-full h-14 text-sm font-black rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 transition-all uppercase tracking-widest mt-4">
              Entrar no Painel
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
