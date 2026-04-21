
import React, { useState, useMemo } from 'react';
import PublicInfoPortal from './PublicInfoPortal';
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

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-1000 relative overflow-hidden ${isAbrilVerde ? 'bg-[#f0fdf4]' : 'bg-gradient-to-br from-slate-100 to-indigo-100'}`}>
      {isAbrilVerde && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-200/10 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-green-200/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Abril Verde Emphasis Watermark */}
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-[0.02] select-none pointer-events-none">
            <h1 className="text-[25vw] font-black leading-none text-emerald-900 rotate-[-12deg] whitespace-nowrap">ABRIL</h1>
            <h1 className="text-[20vw] font-black leading-none text-emerald-900 rotate-[-12deg] whitespace-nowrap mt-[-5vw]">VERDE</h1>
          </div>

          {/* Floating Ribbons/Leaves simulation */}
          <div className="absolute top-10 left-10 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3s' }}></div>
          <div className="absolute bottom-20 right-20 w-16 h-16 bg-green-500/10 rounded-full blur-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-emerald-400/10 rounded-full blur-lg animate-pulse"></div>
        </div>
      )}
      
      <div className={`w-full max-w-md p-8 space-y-6 bg-white/95 backdrop-blur-md rounded-[3rem] shadow-2xl border overflow-hidden relative transition-all duration-500 ${isAbrilVerde ? 'border-emerald-100 shadow-emerald-100/50' : 'border-gray-50'}`}>
        {isAbrilVerde && (
          <div className="absolute top-0 right-0 p-6">
            <div className="bg-emerald-600 text-white text-[9px] font-black px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg animate-bounce">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              ABRIL VERDE 💚
            </div>
          </div>
        )}

        {/* Highlighted Portal Button at the Top */}
        <div className="relative z-10 w-full">
            <button 
              onClick={() => setIsPortalOpen(true)}
              className="w-full bg-white border border-slate-200 hover:border-indigo-300 p-4 rounded-3xl flex items-center gap-4 transition-all group hover:shadow-lg hover:shadow-indigo-50/50"
            >
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left flex-grow">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Portal de Informações</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Fique atualizado sobre a unidade</p>
              </div>
              <div className="ml-auto bg-slate-100 p-2 rounded-xl text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
        </div>

        <div className="text-center relative z-10">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-xl rotate-3 transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-600' : 'bg-indigo-900'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
          </div>
          <h1 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tighter italic">GESTÃO DE DADOS P TAIUVA<br/>TAIÚVA 2026</h1>
          <p className={`mt-2 font-bold uppercase text-[7px] tracking-[0.4em] transition-colors duration-500 ${isAbrilVerde ? 'text-emerald-500' : 'text-indigo-400'}`}>
            Monitoramento de Dados • Gestão 1.Q
          </p>
        </div>
        
        <div className={`p-3 rounded-2xl border transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-50 border-emerald-100' : 'bg-indigo-50 border-indigo-100'}`}>
            <p className={`text-[9px] font-black uppercase text-center leading-none transition-colors duration-500 ${isAbrilVerde ? 'text-emerald-700' : 'text-indigo-700'}`}>
                {isStringLogin 
                    ? "ACESSO RESTRITO POR SETOR" 
                    : "ACESSO PARA PRODUTORES E ADMINS"}
            </p>
        </div>

        <form className="space-y-4 relative z-10" onSubmit={handleLoginSubmit}>
          <div className="space-y-4">
            <div className="relative group">
                <label className={`absolute -top-2 left-5 bg-white px-2 text-[8px] font-black uppercase tracking-widest z-10 transition-colors duration-500 ${isAbrilVerde ? 'text-emerald-600' : 'text-indigo-600'}`}>Nome ou Setor</label>
                <input 
                  type="text"
                  autoComplete="username"
                  required 
                  value={loginName} 
                  onChange={(e) => setLoginName(e.target.value.toUpperCase())} 
                  placeholder="EX: ALMOXARIFADO" 
                  className={`appearance-none block w-full h-14 px-6 border-2 placeholder-gray-300 text-gray-900 rounded-2xl focus:outline-none focus:ring-4 font-black transition-all text-sm ${isAbrilVerde ? 'border-emerald-50 focus:ring-emerald-100 focus:border-emerald-500' : 'border-gray-100 focus:ring-indigo-100 focus:border-indigo-500'}`}
                />
            </div>
            <div className="relative group">
                <label className={`absolute -top-2 left-5 bg-white px-2 text-[8px] font-black uppercase tracking-widest z-10 transition-colors duration-500 ${isAbrilVerde ? 'text-emerald-600' : 'text-indigo-600'}`}>Chave de Acesso</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  inputMode={isStringLogin ? "text" : "numeric"}
                  autoComplete="current-password"
                  required 
                  value={loginCpf} 
                  onChange={(e) => setLoginCpf(e.target.value)}
                  placeholder={passwordPlaceholder} 
                  className={`appearance-none block w-full h-14 px-6 border-2 placeholder-gray-300 text-gray-900 rounded-2xl focus:outline-none focus:ring-4 font-bold transition-all pr-14 text-sm ${isAbrilVerde ? 'border-emerald-50 focus:ring-emerald-100 focus:border-emerald-500' : 'border-gray-100 focus:ring-indigo-100 focus:border-indigo-500'}`}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-5 top-1/2 -translate-y-1/2 transition-colors p-2 ${isAbrilVerde ? 'text-emerald-300 hover:text-emerald-600' : 'text-gray-400 hover:text-indigo-600'}`}
                >
                    {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                </button>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-2xl border border-red-100 text-[9px] font-black text-center animate-shake uppercase leading-tight">
                {loginError}
            </div>
          )}

          <button type="submit" className={`w-full h-14 text-xs font-black rounded-2xl text-white shadow-xl active:scale-95 transition-all uppercase tracking-widest mt-2 ${isAbrilVerde ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-indigo-900 hover:bg-black'}`}>
              Entrar no Painel
          </button>
        </form>

        {!isAbrilVerde && (
          <div className="pt-4 text-center border-t border-gray-100">
              <button 
                onClick={() => setIsPortalOpen(true)}
                className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                Portal de Informações Públicas
              </button>
          </div>
        )}

        <div className="text-center pt-2">
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                TAIÚVA/SP &copy; 2026 • FINANÇAS
            </p>
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
