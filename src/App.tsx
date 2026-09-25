import React, { useState } from 'react';
import { ORDENS_SAIDA_EXCEL_B64 } from './data/ordensSaidaExcelBase64';

export default function App() {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    try {
      const binaryString = window.atob(ORDENS_SAIDA_EXCEL_B64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'Planilha_Ordens_de_Saida_e_Banco_Completo.xlsx';
      document.body.appendChild(a);
      a.click();
      setDownloaded(true);
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 500);
      setTimeout(() => setDownloaded(false), 4000);
    } catch (err) {
      console.error('Erro:', err);
      window.location.href = '/Planilha_Ordens_de_Saida_e_Banco_Completo.xlsx';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '700px',
        width: '100%',
        backgroundColor: '#020617',
        border: '1px solid #1e293b',
        borderRadius: '24px',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-block',
          backgroundColor: 'rgba(6, 95, 70, 0.2)',
          color: '#34d399',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          padding: '6px 16px',
          borderRadius: '50px',
          fontSize: '12px',
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '20px'
        }}>
          📊 Painel Oficial AI Studio
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '12px', color: '#ffffff' }}>
          Baixar Planilha de Ordens de Saída & Banco Completo
        </h1>

        <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '32px' }}>
          Arquivo oficial do Microsoft Excel (<code style={{ color: '#38bdf8' }}>.xlsx</code>) contendo <strong>834 Ordens de Saída de Veículos</strong>, <strong>1.217 Entradas de Estoque</strong>, 81 Fornecedores, Frotas e Motoristas, totalmente pronto e formatado para uso.
        </p>

        <button
          onClick={handleDownload}
          style={{
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: '16px',
            padding: '18px 32px',
            fontSize: '15px',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.5)',
            width: '100%',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#047857'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#059669'}
        >
          {downloaded ? '✅ Arquivo Baixado com Sucesso!' : '📥 Baixar Planilha Excel Oficial (.XLSX)'}
        </button>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginTop: '32px',
          borderTop: '1px solid #1e293b',
          paddingTop: '24px',
          textAlign: 'left'
        }}>
          <div style={{ backgroundColor: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#38bdf8' }}>834</div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginTop: '4px' }}>Ordens de Saída</div>
          </div>
          <div style={{ backgroundColor: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#34d399' }}>1.217</div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginTop: '4px' }}>Entradas Estoque</div>
          </div>
          <div style={{ backgroundColor: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#fbbf24' }}>81</div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginTop: '4px' }}>Fornecedores</div>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a
            href="/sistema_estoque_percapita_servidor_interno.zip"
            download
            style={{ fontSize: '12px', color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold' }}
          >
            📦 Baixar Pacote Servidor (.ZIP)
          </a>
          <span style={{ color: '#334155' }}>•</span>
          <a
            href="/banco_de_dados_atual.json"
            download
            style={{ fontSize: '12px', color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold' }}
          >
            🗄️ Baixar Banco Bruto (.JSON)
          </a>
        </div>
      </div>
    </div>
  );
}
