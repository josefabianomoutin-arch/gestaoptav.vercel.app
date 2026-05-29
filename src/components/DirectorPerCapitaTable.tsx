import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, Printer, Trash2, CheckCircle } from 'lucide-react';

interface RowItem {
  index: number;
  itemName: string;
  quantity: string;
  observation: string;
}

interface DirectorPerCapitaData {
  items: RowItem[];
  chefeDepSigned: boolean;
  chefeDepSignedAt?: string;
  chefeDepName?: string;
  chefeSegSigned: boolean;
  chefeSegSignedAt?: string;
  chefeSegName?: string;
}

interface DirectorPerCapitaTableProps {
  data: DirectorPerCapitaData | null;
  onUpdate: (updatedData: DirectorPerCapitaData) => Promise<{ success: boolean; message?: string }>;
  currentUser?: { name: string; cpf: string; role: string };
  isReadOnly?: boolean; // For Stock Module viewing
}

export const DirectorPerCapitaTable: React.FC<DirectorPerCapitaTableProps> = ({
  data,
  onUpdate,
  currentUser,
  isReadOnly = false,
}) => {
  // Local state for items
  const [localItems, setLocalItems] = useState<RowItem[]>(() => {
    if (data && data.items && data.items.length > 0) {
      return data.items;
    }
    return Array.from({ length: 25 }, (_, i) => ({
      index: i + 1,
      itemName: '',
      quantity: '',
      observation: '',
    }));
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [signatureError, setSignatureError] = useState('');
  const [signatureSuccess, setSignatureSuccess] = useState('');

  // Keep local items stable and in sync asynchronously when data is loaded from Firebase
  useEffect(() => {
    if (data && data.items && data.items.length > 0) {
      const dbStr = JSON.stringify(data.items);
      const locStr = JSON.stringify(localItems);
      if (dbStr !== locStr) {
        const timer = setTimeout(() => {
          setLocalItems(data.items);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.items]);

  const handleFieldChange = (index: number, field: keyof RowItem, value: string) => {
    if (isReadOnly || isSigned) return;

    const updated = localItems.map((itm) => {
      if (itm.index === index) {
        return { ...itm, [field]: value };
      }
      return itm;
    });
    setLocalItems(updated);

    // Debounce or save immediately to Firebase
    saveToFirebase(updated);
  };

  const saveToFirebase = async (itemsList: RowItem[]) => {
    if (!data) return;
    await onUpdate({
      ...data,
      items: itemsList,
    });
  };

  // Determine signature states
  const hasChefeDepSignature = !!data?.chefeDepSigned;
  const hasChefeSegSignature = !!data?.chefeSegSigned;
  const isSigned = hasChefeDepSignature && hasChefeSegSignature;

  // Identify who the current logged-in user is
  const isDouglas = currentUser?.cpf === '29099022859' || currentUser?.name?.toUpperCase().includes('DOUGLAS');
  const isAlfredo = currentUser?.cpf === '29462706821' || currentUser?.name?.toUpperCase().includes('ALFREDO');

  const canSignAsChefeDep = isDouglas;
  const canSignAsChefeSeg = isAlfredo;

  const handleDigitalSign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignatureError('');
    setSignatureSuccess('');

    if (!currentUser || !data) {
      setSignatureError('Usuário não identificado.');
      return;
    }

    const cleanedPassword = passwordInput.trim().replace(/\D/g, '');
    const userCpf = currentUser.cpf.trim().replace(/\D/g, '');

    // The digital signature must match their entrance password (their CPF)
    if (cleanedPassword !== userCpf) {
      setSignatureError('Senha inválida (A senha digital deve ser igual ao seu CPF de acesso).');
      return;
    }

    let updatedData = { ...data };
    const timestamp = new Date().toLocaleString('pt-BR');

    if (canSignAsChefeDep) {
      updatedData = {
        ...updatedData,
        chefeDepSigned: true,
        chefeDepSignedAt: timestamp,
        chefeDepName: 'DOUGLAS FERNANDO SEMENZIN GALDINO',
      };
    } else if (canSignAsChefeSeg) {
      updatedData = {
        ...updatedData,
        chefeSegSigned: true,
        chefeSegSignedAt: timestamp,
        chefeSegName: 'ALFREDO GUILHERME LOPES',
      };
    } else {
      setSignatureError('Seu usuário não possui permissão para validar este documento.');
      return;
    }

    const res = await onUpdate(updatedData);
    if (res.success) {
      setSignatureSuccess('Assinatura digital inserida com sucesso!');
      setPasswordInput('');
    } else {
      setSignatureError(res.message || 'Erro ao gravar assinatura digital.');
    }
  };

  const handleRevokeSignature = async (role: 'chefeDep' | 'chefeSeg') => {
    if (!data) return;
    if (role === 'chefeDep' && !isDouglas && currentUser?.role !== 'admin') {
      alert('Apenas o Chefe de Departamento pode remover sua assinatura.');
      return;
    }
    if (role === 'chefeSeg' && !isAlfredo && currentUser?.role !== 'admin') {
      alert('Apenas o Chefe de Segurança Interna pode remover sua assinatura.');
      return;
    }

    let updatedData = { ...data };
    if (role === 'chefeDep') {
      updatedData = {
        ...updatedData,
        chefeDepSigned: false,
        chefeDepSignedAt: undefined,
        chefeDepName: undefined,
      };
    } else {
      updatedData = {
        ...updatedData,
        chefeSegSigned: false,
        chefeSegSignedAt: undefined,
        chefeSegName: undefined,
      };
    }

    const res = await onUpdate(updatedData);
    if (res.success) {
      setSignatureSuccess('Assinatura revogada.');
    } else {
      setSignatureError('Erro ao revogar assinatura.');
    }
  };

  const handleClearTable = async () => {
    if (!data) return;
    if (!window.confirm('Tem certeza de que deseja limpar toda a tabela de itens e as assinaturas digitais?')) {
      return;
    }

    const emptyItems = Array.from({ length: 25 }, (_, i) => ({
      index: i + 1,
      itemName: '',
      quantity: '',
      observation: '',
    }));

    const clearedData = {
      items: emptyItems,
      chefeDepSigned: false,
      chefeDepSignedAt: undefined,
      chefeDepName: undefined,
      chefeSegSigned: false,
      chefeSegSignedAt: undefined,
      chefeSegName: undefined,
    };

    const res = await onUpdate(clearedData);
    if (res.success) {
      setLocalItems(emptyItems);
      setSignatureSuccess('Tabela limpa com sucesso!');
    } else {
      setSignatureError('Erro ao limpar a tabela.');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o relatório.');
      return;
    }

    // Create 25 table rows to output structured format in print preview
    const allItemsHtml = localItems.map(item => `
        <tr style="${item.itemName.trim() !== '' ? 'background-color: #f8fafc;' : ''}">
          <td style="text-align: center; height: 32px;">${item.index}</td>
          <td style="text-align: left; font-weight: ${item.itemName.trim() !== '' ? 'bold' : 'normal'};">${item.itemName.toUpperCase() || ''}</td>
          <td style="text-align: center; font-weight: bold; color: #1e3a8a;">${item.quantity || ''}</td>
          <td style="text-align: left; color: #475569;">${item.observation || ''}</td>
        </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pedido de Per Capita dos Diretores - Validação Digital</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            margin: 40px;
            color: #1e293b;
            background-color: #ffffff;
            font-size: 12px;
            line-height: 1.5;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e3a8a;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 20px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            color: #1e3a8a;
          }
          .logo span {
            color: #ef4444;
          }
          .document-title {
            text-align: right;
          }
          .document-title h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
          }
          .document-title p {
            margin: 5px 0 0 0;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
          }
          .meta-info {
            background-color: #f1f5f9;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .meta-item {
            margin: 0;
            font-size: 11px;
          }
          .meta-item strong {
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          th {
            background-color: #1e3a8a;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            padding: 10px;
            border: 1px solid #1e3a8a;
            letter-spacing: 0.5px;
          }
          td {
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
          }
          .signatures-container {
            margin-top: 50px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .signature-box {
            border: 2px dashed #94a3b8;
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            background-color: #f8fafc;
          }
          .signature-box.signed {
            border: 2px solid #10b981;
            background-color: #ecfdf5;
          }
          .signature-box h3 {
            margin: 0 0 10px 0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #475569;
          }
          .signature-box.signed h3 {
            color: #065f46;
          }
          .signature-box .seal {
            background-color: #10b981;
            color: white;
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-weight: 700;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
          }
          .signature-box .signer-name {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .signature-box .signer-meta {
            font-size: 10px;
            color: #64748b;
          }
          .signature-box .empty-seal {
            color: #94a3b8;
            font-size: 11px;
            font-weight: 500;
            padding: 15px 0;
          }
          .footer-note {
            margin-top: 60px;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
          }
          @media print {
            body {
              margin: 20px;
            }
            .no-print {
              display: none;
            }
            .signature-box {
              background-color: #ffffff !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="logo">P. TAIÚVA<span>•</span>ESTOQUE</div>
          <div class="document-title">
            <h1>Pedido Per Capita dos Diretores</h1>
            <p>Módulo de Estoque - Gestão de Dados P Taiúva</p>
          </div>
        </div>

        <div class="meta-info">
          <div>
            <p class="meta-item"><strong>Documento:</strong> Solicitação Eletrônica para Separação de Cota</p>
            <p class="meta-item"><strong>Exercício:</strong> Ano Civil 2026</p>
          </div>
          <div style="text-align: right;">
            <p class="meta-item"><strong>Data de Impressão:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p class="meta-item"><strong>Status:</strong> ${isSigned ? '<span style="color: #10b981; font-weight: bold;">TOTALMENTE AUTENTICADO</span>' : '<span style="color: #f59e0b; font-weight: bold;">AGUARDANDO VALIDAÇÕES</span>'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">Item</th>
              <th style="text-align: left;">Descrição do Item Solicitado</th>
              <th style="width: 100px; text-align: center;">Quantidade</th>
              <th style="text-align: left;">Observações / Destinação</th>
            </tr>
          </thead>
          <tbody>
            ${allItemsHtml}
          </tbody>
        </table>

        <div class="signatures-container">
          <div class="signature-box ${hasChefeDepSignature ? 'signed' : ''}">
            <h3>Divisão Chefe do Departamento</h3>
            ${hasChefeDepSignature ? `
              <div class="seal">Chave Digital Validada</div>
              <div class="signer-name">${data?.chefeDepName}</div>
              <div class="signer-meta">Chefe de Departamento</div>
              <div class="signer-meta">Validado em: ${data?.chefeDepSignedAt}</div>
            ` : `
              <div class="empty-seal">Pendente de assinatura eletrônica do Chefe de Departamento</div>
            `}
          </div>

          <div class="signature-box ${hasChefeSegSignature ? 'signed' : ''}">
            <h3>Divisão Chefe da Segurança Interna</h3>
            ${hasChefeSegSignature ? `
              <div class="seal">Chave Digital Validada</div>
              <div class="signer-name">${data?.chefeSegName}</div>
              <div class="signer-meta">Chefe da Segurança Interna</div>
              <div class="signer-meta">Validado em: ${data?.chefeSegSignedAt}</div>
            ` : `
              <div class="empty-seal">Pendente de assinatura eletrônica do Chefe da Segurança Interna</div>
            `}
          </div>
        </div>

        <div class="footer-note">
          Este documento foi emitido e validado eletronicamente no sistema integrado de gestão da Penitenciária de Taiúva.<br/>
          A assinatura eletrônica possui amparo legal e confere autenticidade ao pedido, autorizando o setor de Estoques a proceder com a separação.
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Check if current user is allowed to view signature panel
  const canSeeSignaturePanel = isDouglas || isAlfredo;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in">
      <div className="p-4 md:p-6 bg-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-red-500 w-2.5 h-2.5 rounded-full animate-pulse"></span>
            <h2 className="text-lg font-black text-white uppercase tracking-tighter">
              Per Capita Diretores - {currentUser?.cpf === '29099022859' || currentUser?.name?.toUpperCase().includes('DOUGLAS') ? 'Divisão Chefe do Departamento' : currentUser?.cpf === '29462706821' || currentUser?.name?.toUpperCase().includes('ALFREDO') ? 'Divisão Chefe da Segurança Interna' : 'Módulo Geral de Almoxarifado'}
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Preenchimento simplificado e assinatura digital via celular
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-none justify-center bg-indigo-600 hover:bg-slate-800 text-white font-black py-2.5 px-5 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Printer className="h-4 w-4" />
            Imprimir Pedido
          </button>
          {!isReadOnly && !isSigned && (
            <button
              onClick={handleClearTable}
              className="md:flex-none bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-black p-2.5 rounded-xl active:scale-95 transition-all"
              title="Limpar Tabela"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isSigned && (
        <div className="bg-emerald-50 border-y border-emerald-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2 rounded-2xl shadow-lg shadow-emerald-600/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-emerald-900 font-black text-xs uppercase tracking-tight">PEDIDO TOTALMENTE VALIDADO DIGITALMENTE</p>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase mt-0.5">Pronto para separação e entrega física no Estoque</p>
            </div>
          </div>
          <div className="w-full md:w-auto flex flex-col md:flex-row gap-2">
            <div className="bg-emerald-100/50 text-emerald-800 rounded-xl px-4 py-2 border border-emerald-200 text-[10px] font-black uppercase">
              DEP: {data?.chefeDepSignedAt}
            </div>
            <div className="bg-emerald-100/50 text-emerald-800 rounded-xl px-4 py-2 border border-emerald-200 text-[10px] font-black uppercase">
              SEG: {data?.chefeSegSignedAt}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Table (Optimized for Mobile) */}
      <div className="p-4 md:p-6 overflow-x-auto">
        <div className="min-w-[650px]">
          <div className="grid grid-cols-[60px_1fr_120px_2fr] gap-2 md:gap-3 mb-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
            <div>Item</div>
            <div className="text-left">Nome do Item</div>
            <div>Quantidade</div>
            <div className="text-left">Observações / Destino</div>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {localItems.map((item) => (
              <div
                key={item.index}
                className={`grid grid-cols-[60px_1fr_120px_2fr] gap-2 md:gap-3 items-center p-2 rounded-2xl border transition-all ${
                  item.itemName.trim() !== '' ? 'bg-slate-50/70 border-zinc-200' : 'bg-white border-slate-100'
                } hover:border-slate-300`}
              >
                {/* ID Column */}
                <div className="flex justify-center">
                  <span className="h-7 w-7 rounded-lg bg-slate-100 text-slate-500 font-black text-xs flex items-center justify-center border border-slate-200 shadow-sm">
                    {item.index}
                  </span>
                </div>

                {/* Name Column */}
                <div>
                  <input
                    type="text"
                    disabled={isReadOnly || isSigned}
                    placeholder="Descrição do item..."
                    value={item.itemName}
                    onChange={(e) => handleFieldChange(item.index, 'itemName', e.target.value)}
                    className="w-full bg-transparent px-3 py-2 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-300 border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                {/* Quantity Column */}
                <div>
                  <input
                    type="text"
                    disabled={isReadOnly || isSigned}
                    placeholder="Ex: 5 Kg"
                    value={item.quantity}
                    onChange={(e) => handleFieldChange(item.index, 'quantity', e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-center rounded-xl text-xs font-extrabold text-indigo-700 placeholder-slate-300 border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                {/* Observation Column */}
                <div>
                  <input
                    type="text"
                    disabled={isReadOnly || isSigned}
                    placeholder="Ref, marca, observação..."
                    value={item.observation}
                    onChange={(e) => handleFieldChange(item.index, 'observation', e.target.value)}
                    className="w-full bg-transparent px-3 py-2 rounded-xl text-xs text-slate-600 placeholder-slate-300 border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Signature Module */}
      <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Dept Chief Status */}
          <div className={`p-4 rounded-3xl border transition-all ${hasChefeDepSignature ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200/80 shadow-md'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Divisão 01</span>
                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">CHEFE DE DEPARTAMENTO</span>
              </div>
              {hasChefeDepSignature ? (
                <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  Assinado
                </div>
              ) : (
                <div className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                  Pendente
                </div>
              )}
            </div>

            {hasChefeDepSignature ? (
              <div className="text-xs space-y-1.5 font-bold">
                <p className="text-slate-950 font-black uppercase">{data?.chefeDepName}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-tight">{data?.chefeDepSignedAt}</p>
                {canSignAsChefeDep && (
                  <button
                    onClick={() => handleRevokeSignature('chefeDep')}
                    className="mt-2 text-[9px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-wider block hover:underline"
                  >
                    Remover Assinatura
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">Aguardando inserção de chave digital por Douglas Fernando Semenzin Galdino.</p>
            )}
          </div>

          {/* Security Chief Status */}
          <div className={`p-4 rounded-3xl border transition-all ${hasChefeSegSignature ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200/80 shadow-md'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Divisão 02</span>
                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">CHEFE DA SEGURANÇA INTERNA</span>
              </div>
              {hasChefeSegSignature ? (
                <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  Assinado
                </div>
              ) : (
                <div className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                  Pendente
                </div>
              )}
            </div>

            {hasChefeSegSignature ? (
              <div className="text-xs space-y-1.5 font-bold">
                <p className="text-slate-950 font-black uppercase">{data?.chefeSegName}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-tight">{data?.chefeSegSignedAt}</p>
                {canSignAsChefeSeg && (
                  <button
                    onClick={() => handleRevokeSignature('chefeSeg')}
                    className="mt-2 text-[9px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-wider block hover:underline"
                  >
                    Remover Assinatura
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">Aguardando inserção de chave digital por Alfredo Guilherme Lopes.</p>
            )}
          </div>
        </div>

        {/* Password input sign form (only visible to those who need to sign and hasn't signed yet) */}
        {!isReadOnly && canSeeSignaturePanel && ((canSignAsChefeDep && !hasChefeDepSignature) || (canSignAsChefeSeg && !hasChefeSegSignature)) && (
          <form onSubmit={handleDigitalSign} className="mt-6 p-4 md:p-6 bg-white rounded-3xl border border-zinc-200 max-w-lg mx-auto shadow-md">
            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1 bg-slate-100 px-3 py-1 rounded-full w-max">
              <ShieldCheck className="h-3 w-3 text-indigo-600" /> Painel de Assinatura Eletrônica
            </span>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-2">
              Validar com senha de login (CPF)
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mb-4">
              Ao digitar seu CPF de acesso e validar, você estará assinando digitalmente a solicitação de Per Capita e responsabilizando-se pelo pedido.
            </p>

            <div className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Digite seu CPF..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold text-center focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                  required
                />
              </div>

              {signatureError && (
                <p className="text-rose-600 text-[11px] font-black text-center">{signatureError}</p>
              )}
              {signatureSuccess && (
                <p className="text-emerald-600 text-[11px] font-black text-center">{signatureSuccess}</p>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl text-[11px] uppercase tracking-wider flex justify-center items-center gap-2 shadow-lg shadow-indigo-600/10 active:scale-95 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                Gravar Minha Assinatura Digital
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
