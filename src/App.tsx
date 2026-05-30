import DirectorPerCapitaTable from './components/DirectorPerCapitaTable';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans transition-all">
      {/* Top micro status bar indicating high state integrity */}
      <div className="bg-slate-950 border-b border-slate-900/60 text-[10px] text-slate-450 px-6 py-1.5 flex justify-between items-center tracking-wider text-slate-400 font-bold print:hidden">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          Conexão Segura Ativa &bull; Criptografia Local
        </span>
        <span className="uppercase text-slate-400">
          SISTEMA DE CONTROLE DE PER CAPITA E ABASTECIMENTO - SAP SP V2.5
        </span>
      </div>

      <DirectorPerCapitaTable />

      {/* Footer information bar */}
      <footer className="mt-auto py-8 border-t border-slate-950 bg-slate-950/80 text-center text-xs text-slate-500 print:hidden px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>
            &copy; {new Date().getFullYear()} Painel de Controle de Abastecimento Geral. Todos os direitos reservados.
          </p>
          <div className="flex gap-4 text-slate-500">
            <a href="#" className="hover:text-yellow-400 transition-colors">Termos de Uso</a>
            <span>&bull;</span>
            <a href="#" className="hover:text-yellow-400 transition-colors">Políticas de Segurança</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
