
import React, { useState } from 'react';
import { ClipboardList, Search, Filter, CheckCircle2, XCircle, Clock, AlertCircle, Edit3, Trash2, Save, X, CalendarPlus, Calendar, Wrench, FileText, Upload, ShieldCheck, Printer, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceOrder, MaintenanceSchedule } from '../types';

interface AdminServiceOrderProps {
  orders: ServiceOrder[];
  onUpdate: (order: ServiceOrder) => Promise<{ success: boolean; message: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; message: string }>;
  maintenanceSchedules?: MaintenanceSchedule[];
  onRegisterMaintenanceSchedule?: (schedule: Omit<MaintenanceSchedule, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateMaintenanceSchedule?: (idOrSchedule: string | MaintenanceSchedule, updates?: Partial<MaintenanceSchedule>) => Promise<{ success: boolean; message: string }>;
  onDeleteMaintenanceSchedule?: (id: string) => Promise<{ success: boolean; message: string }>;
  systemPasswords?: Record<string, string>;
}

const AdminServiceOrder: React.FC<AdminServiceOrderProps> = ({ 
  orders = [], 
  onUpdate, 
  onDelete,
  maintenanceSchedules = [],
  onRegisterMaintenanceSchedule,
  onUpdateMaintenanceSchedule,
  onDeleteMaintenanceSchedule,
  systemPasswords = {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterStage, setFilterStage] = useState<string>('todas');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ServiceOrder | null>(null);
  const [editScheduleForm, setEditScheduleForm] = useState<MaintenanceSchedule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Validation State
  const [validatingScheduleId, setValidatingScheduleId] = useState<string | null>(null);
  const [validationRole, setValidationRole] = useState<'chief' | 'director' | null>(null);
  const [validationPassword, setValidationPassword] = useState('');

  // Maintenance Schedule Modal State
  const [schedulingOrderId, setSchedulingOrderId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<Partial<MaintenanceSchedule>>({
    date: '',
    time: '',
    location: '',
    accompanyingPerson: '',
    toolsNeeded: '',
    tools: Array(25).fill(''),
    ppls: Array(5).fill(''),
    status: 'agendado',
    toolsStatus: 'fora',
    exitAuthorizationUrl: ''
  });

  const [activeSubTab, setActiveSubTab] = useState<'ongoing' | 'finished'>('ongoing');

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.requestingSector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'todos' || order.status === filterStatus;
    const matchesStage = filterStage === 'todas' || order.projectStage === filterStage;
    
    // Sub-tab filtering
    const matchesSubTab = activeSubTab === 'ongoing' 
      ? (order.status !== 'concluido' && order.status !== 'cancelado')
      : (order.status === 'concluido' || order.status === 'cancelado');

    return matchesSearch && matchesStatus && matchesStage && matchesSubTab;
  }).sort((a, b) => {
    const priorityWeight: Record<string, number> = {
      'ALTA': 0,
      'MÉDIA': 1,
      'BAIXA': 2,
      'PENDENTE': 3
    };
    const weightA = priorityWeight[a.priority] ?? 4;
    const weightB = priorityWeight[b.priority] ?? 4;
    if (weightA !== weightB) return weightA - weightB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleEdit = (order: ServiceOrder) => {
    setEditingId(order.id);
    setEditForm({ ...order });
    const schedule = maintenanceSchedules.find(s => s.serviceOrderId === order.id);
    if (schedule) {
      setEditScheduleForm({ ...schedule });
    } else {
      setEditScheduleForm(null);
    }
  };

  const handleSave = async () => {
    if (!editForm) return;
    
    try {
      const result = await onUpdate(editForm);
      if (result.success) {
        if (editScheduleForm && onUpdateMaintenanceSchedule) {
          await onUpdateMaintenanceSchedule(editScheduleForm.id, editScheduleForm);
        }
        setEditingId(null);
        setEditForm(null);
        setEditScheduleForm(null);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar as alterações');
    }
  };

  const handleValidate = async () => {
    if (!validatingScheduleId || !validationRole || !onUpdateMaintenanceSchedule) return;

    const key = validationRole === 'chief' ? 'WALTER RODRIGUES JUNIOR' : 'ALFREDO GUILHERME LOPES';
    const correctPassword = systemPasswords[key] || (validationRole === 'chief' ? 'chefe123' : 'diretor123');

    if (validationPassword === correctPassword) {
      const updates: Partial<MaintenanceSchedule> = validationRole === 'chief' 
        ? { validatedByChief: true, validatedByChiefAt: new Date().toISOString() }
        : { validatedByDirector: true, validatedByDirectorAt: new Date().toISOString() };
      
      await onUpdateMaintenanceSchedule(validatingScheduleId, updates);
      toast.success(`Validado por ${key} com sucesso!`);
      setValidatingScheduleId(null);
      setValidationRole(null);
      setValidationPassword('');
    } else {
      toast.error('Senha incorreta.');
    }
  };

  const generatePDF = (schedule: MaintenanceSchedule, order: ServiceOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const pplsList = (schedule.ppls || []).filter(p => p.trim() !== '').map(p => `<li>${p}</li>`).join('');
    const validationDate = schedule.validatedByDirectorAt ? new Date(schedule.validatedByDirectorAt) : new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateInFull = validationDate.toLocaleDateString('pt-BR', dateOptions);

    const formatTimestamp = (ts?: string) => {
      if (!ts) return '';
      return new Date(ts).toLocaleString('pt-BR');
    };

    const html = `
      <html>
        <head>
          <title>Autorização de Saída</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; }
            .header { text-align: center; font-weight: bold; margin-bottom: 40px; font-size: 18px; text-decoration: underline; }
            .content { margin-bottom: 30px; text-align: justify; }
            .date-centered { text-align: center; margin: 30px 0; font-weight: bold; }
            .ppls { margin: 20px 0; list-style: none; padding: 0; }
            .ppls li { margin-bottom: 5px; border-bottom: 1px dotted #ccc; padding-bottom: 2px; }
            .signatures { margin-top: 60px; display: flex; flex-direction: column; align-items: center; gap: 40px; }
            .signature-block { text-align: center; width: 100%; max-width: 500px; }
            .digital-signature {
              border: 2px solid #000;
              padding: 10px 20px;
              display: inline-block;
              text-align: center;
              margin-bottom: 10px;
              background: #fff;
              position: relative;
            }
            .signature-badge {
              font-size: 9px;
              color: #000;
              font-weight: bold;
              text-transform: uppercase;
              border-bottom: 1px solid #000;
              margin-bottom: 5px;
              padding-bottom: 2px;
              letter-spacing: 1px;
            }
            .signature-details {
              font-size: 12px;
              font-weight: bold;
            }
            .signature-timestamp {
              font-size: 9px;
              font-weight: normal;
              margin-top: 2px;
            }
            .role { font-size: 11px; font-weight: bold; margin-top: 5px; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">AUTORIZAÇÃO DE SAÍDA PARA TRABALHO</div>
          
          <div class="content">
            <p>Senhores Chefes;</p>
            <p>Ficam os PPL’s abaixo qualificados, AUTORIZADOS a trabalhar no setor de MANUTENÇÃO EXTERNA – horário das <strong>${schedule.time}</strong>, no dia <strong>${new Date(schedule.date).toLocaleDateString('pt-BR')}</strong>, devidamente acompanhado por Policial Penal.</p>
            
            <div class="date-centered">Taiúva, ${dateInFull}.</div>
            
            <p><strong>NOME/MATRICULA</strong></p>
            <ul class="ppls">
              ${pplsList || '<li>Nenhum PPL designado</li>'}
            </ul>
          </div>

          <div class="signatures">
            <div class="signature-block">
              <div class="digital-signature">
                <div class="signature-badge">Validado Digitalmente</div>
                <div class="signature-details">
                  WALTER RODRIGUES JUNIOR<br/>
                  <div class="signature-timestamp">Autenticado em: ${formatTimestamp(schedule.validatedByChiefAt)}</div>
                </div>
              </div>
              <div class="role">Chefe de Seç. de Formação Educ, Trab. e Capacitação Profiss.</div>
            </div>

            <div class="signature-block">
              <div class="digital-signature">
                <div class="signature-badge">Validado Digitalmente</div>
                <div class="signature-details">
                  ALFREDO GUILHERME LOPES<br/>
                  <div class="signature-timestamp">Autenticado em: ${formatTimestamp(schedule.validatedByDirectorAt)}</div>
                </div>
              </div>
              <div class="role">Diretor do Centro de Segurança e Disciplina</div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRegisterMaintenanceSchedule || !schedulingOrderId) return;

    const order = orders.find(o => o.id === schedulingOrderId);
    if (!order) return;

    try {
      await onRegisterMaintenanceSchedule({
        serviceOrderId: schedulingOrderId,
        vehicleId: '',
        description: `Manutenção para OS: ${order.description}`,
        date: scheduleForm.date || '',
        time: scheduleForm.time || '',
        location: scheduleForm.location || '',
        accompanyingPerson: scheduleForm.accompanyingPerson || '',
        toolsNeeded: scheduleForm.toolsNeeded || '',
        tools: scheduleForm.tools || Array(25).fill(''),
        ppls: scheduleForm.ppls || Array(5).fill(''),
        status: 'agendado',
        toolsStatus: 'fora',
        exitAuthorizationUrl: scheduleForm.exitAuthorizationUrl || '',
        validatedByChief: false,
        validatedByDirector: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setSchedulingOrderId(null);
      setScheduleForm({
        date: '',
        time: '',
        location: '',
        accompanyingPerson: '',
        toolsNeeded: '',
        tools: Array(25).fill(''),
        ppls: Array(5).fill(''),
        status: 'agendado',
        toolsStatus: 'fora',
        exitAuthorizationUrl: ''
      });
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'em_andamento': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'concluido': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'cancelado': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'ALTA': return 'bg-red-600 text-white';
      case 'MÉDIA': return 'bg-amber-500 text-white';
      case 'BAIXA': return 'bg-emerald-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getProjectStageText = (stage?: string) => {
    switch(stage) {
      case '1_aquisicao_material': return '1ª Etapa: Aquisição de Material';
      case '2_disponibilidade_mao_obra': return '2ª Etapa: Disponibilidade de Mão de Obra';
      case '3_em_execucao': return '3ª Etapa: Em Execução';
      case '4_finalizada': return '4ª Etapa: Finalizada';
      default: return null;
    }
  };

  const generateControlReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const ongoingCount = orders.filter(o => o.status !== 'concluido' && o.status !== 'cancelado').length;
    const finishedCount = orders.filter(o => o.status === 'concluido' || o.status === 'cancelado').length;
    const pendingCount = orders.filter(o => o.status === 'pendente').length;

    const reportTitle = 'RELATÓRIO GERAL DE MANUTENÇÕES';

    const allOrdersSorted = [...orders].sort((a, b) => {
      const statusOrder: Record<string, number> = { 'pendente': 0, 'em_andamento': 1, 'concluido': 2, 'cancelado': 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) return (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
      
      const priorityWeight: Record<string, number> = { 'ALTA': 0, 'MÉDIA': 1, 'BAIXA': 2 };
      return (priorityWeight[a.priority] ?? 3) - (priorityWeight[b.priority] ?? 3);
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 40px; 
              color: #1e293b;
              line-height: 1.5;
              background: #fcfcfc;
            }
            .header { 
              text-align: center; 
              border-bottom: 4px solid #4f46e5; 
              padding-bottom: 15px; 
              margin-bottom: 25px; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 28px; 
              font-weight: 900; 
              letter-spacing: -0.05em; 
              text-transform: uppercase;
              font-style: italic;
              color: #4f46e5;
            }
            .header p { 
              margin: 5px 0 0; 
              font-size: 12px; 
              font-weight: 700; 
              text-transform: uppercase; 
              letter-spacing: 0.2em;
              color: #64748b;
            }
            .summary-cards {
              display: flex;
              gap: 10px;
              margin-bottom: 20px;
            }
            .card {
              flex: 1;
              background: white;
              border: 1px solid #e2e8f0;
              padding: 8px 4px;
              border-radius: 10px;
              text-align: center;
            }
            .card .label { 
              font-size: 8px; 
              font-weight: 900; 
              color: #64748b; 
              text-transform: uppercase; 
              letter-spacing: 0.05em; 
              margin-bottom: 2px; 
            }
            .card .value { 
              font-size: 20px; 
              font-weight: 900; 
              letter-spacing: -0.05em;
              font-style: italic;
            }
            .val-total { color: #1e1b4b; }
            .val-pending { color: #d97706; }
            .val-ongoing { color: #2563eb; }
            .val-finished { color: #059669; }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
              font-size: 10px;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            th { 
              background: #4f46e5; 
              color: white; 
              text-align: left; 
              padding: 14px 12px; 
              text-transform: uppercase; 
              font-weight: 900;
              letter-spacing: 0.05em;
            }
            td { 
              padding: 12px; 
              border-bottom: 1px solid #f1f5f9; 
              font-weight: 500;
              vertical-align: top;
            }
            tr:nth-child(even) { background: #f8fafc; }
            .badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 6px;
              font-weight: 900;
              font-size: 8px;
              text-transform: uppercase;
            }
            .priority-ALTA { background: #fee2e2; color: #dc2626; }
            .priority-MÉDIA { background: #fef3c7; color: #d97706; }
            .priority-BAIXA { background: #dcfce7; color: #16a34a; }
            .status-pendente { color: #d97706; font-weight: 900; }
            .status-em_andamento { color: #2563eb; font-weight: 900; }
            .status-concluido { color: #16a34a; font-weight: 900; }
            .status-cancelado { color: #dc2626; font-weight: 900; }
            
            .footer { 
              margin-top: 60px; 
              text-align: right; 
              font-size: 10px; 
              color: #94a3b8; 
              font-weight: 700;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
            }
            @media print {
              @page { size: A4 landscape; margin: 10mm; }
              .no-print { display: none; }
              body { padding: 0; background: white; }
              .card { box-shadow: none; border: 1px solid #e2e8f0; }
              table { box-shadow: none; border: 1px solid #e2e8f0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Seção de Infraestrutura e Logística</h1>
            <p>${reportTitle}</p>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="label">Total Geral</div>
              <div class="value val-total">${orders.length}</div>
            </div>
            <div class="card">
              <div class="label">Pendentes</div>
              <div class="value val-pending">${pendingCount}</div>
            </div>
            <div class="card">
              <div class="label">Em Andamento</div>
              <div class="value val-ongoing">${ongoingCount}</div>
            </div>
            <div class="card">
              <div class="label">Finalizadas</div>
              <div class="value val-finished">${finishedCount}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Solicitante / Setor</th>
                <th>Descrição / Local / Obs.</th>
                <th>Tipo / Categoria</th>
                <th>Prioridade</th>
                <th>Status / Etapa</th>
                <th>Recursos (PPLs/Ferr.)</th>
                <th>Data Agend.</th>
              </tr>
            </thead>
            <tbody>
              ${allOrdersSorted.map(o => {
                const schedule = maintenanceSchedules.find(ms => ms.serviceOrderId === o.id);
                const pplsCount = schedule?.ppls?.filter(p => p.trim() !== '').length || 0;
                const toolsCount = schedule?.tools?.filter(t => t.trim() !== '').length || 0;
                const stageText = getProjectStageText(o.projectStage);
                
                return `
                  <tr>
                    <td>${o.id.slice(-4).toUpperCase()}</td>
                    <td>
                      <div style="font-weight: 900">${o.requester}</div>
                      <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">${o.requestingSector}</div>
                    </td>
                    <td>
                      <div style="font-weight: 700; margin-bottom: 4px;">${o.description}</div>
                      <div style="font-size: 8px; color: #64748b; margin-bottom: 4px;">📍 ${o.location || 'N/A'}</div>
                      ${o.inspectionObservations ? `<div style="font-size: 8px; color: #4f46e5; border-top: 1px solid #f1f5f9; padding-top: 4px;">📝 ${o.inspectionObservations}</div>` : ''}
                    </td>
                    <td>
                      <div style="font-weight: 900; color: #4f46e5;">${o.serviceType.toUpperCase()}</div>
                      <div style="font-size: 8px; color: #64748b;">${o.category}</div>
                    </td>
                    <td><span class="badge priority-${o.priority}">${o.priority}</span></td>
                    <td>
                      <div class="status-${o.status}">${o.status.replace('_', ' ').toUpperCase()}</div>
                      ${stageText ? `<div style="font-size: 8px; color: #64748b; margin-top: 4px;">${stageText}</div>` : ''}
                    </td>
                    <td>
                      <div style="font-size: 8px; font-weight: 700;">
                        ${pplsCount > 0 ? `👥 ${pplsCount} PPLs` : ''}
                        ${pplsCount > 0 && toolsCount > 0 ? '<br/>' : ''}
                        ${toolsCount > 0 ? `🛠️ ${toolsCount} Ferr.` : ''}
                        ${pplsCount === 0 && toolsCount === 0 ? '---' : ''}
                      </div>
                    </td>
                    <td>${schedule ? new Date(schedule.date).toLocaleDateString('pt-BR') : '---'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            Gerado em ${new Date().toLocaleString('pt-BR')}
          </div>

          <script>
            window.onload = () => {
              window.print();
              // window.close(); // Opcional
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-4 rounded-3xl shadow-lg shadow-indigo-200">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter italic leading-none">Gestão de Infraestrutura</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Controle Total de Solicitações de Serviço</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
            <button
              onClick={() => setActiveSubTab('ongoing')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeSubTab === 'ongoing'
                  ? 'bg-white text-indigo-600 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Em Andamento
            </button>
            <button
              onClick={() => setActiveSubTab('finished')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeSubTab === 'finished'
                  ? 'bg-white text-emerald-600 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finalizadas
            </button>
          </div>

          <button
            onClick={generateControlReport}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 font-black py-3 px-6 rounded-2xl text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <FileText className="h-4 w-4" />
            Relatório de Controle
          </button>
        </div>
      </div>

      {/* Summary Cards Section */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Geral', value: orders.length, color: 'text-indigo-950' },
          { label: 'Pendentes', value: orders.filter(o => o.status === 'pendente').length, color: 'text-amber-600' },
          { label: 'Em Andamento', value: orders.filter(o => o.status === 'em_andamento').length, color: 'text-blue-600' },
          { label: 'Finalizadas', value: orders.filter(o => o.status === 'concluido' || o.status === 'cancelado').length, color: 'text-emerald-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <p className={`text-4xl font-black ${stat.color} tracking-tighter italic`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-200">
        <div className="relative flex-grow md:flex-grow-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar solicitações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all w-full md:w-64"
          />
        </div>
        <div className="relative flex-grow md:flex-grow-0">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pl-12 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all appearance-none w-full md:w-48"
          >
            <option value="todos">Todos Status</option>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="relative flex-grow md:flex-grow-0">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="pl-12 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all appearance-none w-full md:w-64"
          >
            <option value="todas">Todas as Etapas</option>
            <option value="1_aquisicao_material">1ª Etapa: Aquisição de Material</option>
            <option value="2_disponibilidade_mao_obra">2ª Etapa: Disponibilidade de Mão de Obra</option>
            <option value="3_em_execucao">3ª Etapa: Em Execução</option>
            <option value="4_finalizada">4ª Etapa: Finalizada</option>
          </select>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order, index) => (
            <div 
              key={order.id} 
              className={`bg-white rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`absolute top-0 right-0 p-8 opacity-5 pointer-events-none`}>
                <ClipboardList className="h-32 w-32" />
              </div>
              
              <div className="p-8 relative z-10">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-grow space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getPriorityColor(order.priority)}`}>
                        Prioridade: {order.priority}
                      </span>
                      <span className="bg-zinc-100 text-zinc-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-200">
                        {order.serviceType}
                      </span>
                      <span className="bg-zinc-100 text-zinc-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-200">
                        {order.category}
                      </span>
                      {getProjectStageText(order.projectStage) && (
                        <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">
                          {getProjectStageText(order.projectStage)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Setor Solicitante</p>
                        <h4 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter italic leading-tight">{order.requestingSector}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="h-6 w-6 bg-indigo-100 rounded-full flex items-center justify-center">
                              <Clock className="h-3 w-3 text-indigo-600" />
                          </div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Solicitado por <span className="text-indigo-600">{order.requester}</span> em {new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descrição da Solicitação</p>
                        <p className="text-sm text-gray-700 italic leading-relaxed font-medium">"{order.description}"</p>
                      </div>
                    </div>

                    {order.inspectionObservations && (
                      <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Observações da Infraestrutura</p>
                        <p className="text-sm text-indigo-900 font-bold leading-relaxed">{order.inspectionObservations}</p>
                      </div>
                    )}

                    {maintenanceSchedules?.filter(ms => ms.serviceOrderId === order.id).map(ms => (
                      <div key={ms.id} className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <CalendarPlus className="h-3 w-3" />
                          Agendamento de Manutenção
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div>
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Data/Hora</p>
                            <p className="text-sm text-emerald-900 font-black">{ms.date} às {ms.time}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Local</p>
                            <p className="text-sm text-emerald-900 font-black">{ms.location}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Acompanhante</p>
                            <p className="text-sm text-emerald-900 font-black">{ms.accompanyingPerson}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Ferramentas</p>
                            <p className="text-sm text-emerald-900 font-black">
                              {ms.tools?.filter(t => t.trim() !== '').length || 0} itens relacionados
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Mão de Obra (PPLs)</p>
                            <p className="text-sm text-emerald-900 font-black">
                              {ms.ppls?.filter(p => p.trim() !== '').length || 0} PPLs designados
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Status das Ferramentas</p>
                            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              ms.toolsStatus === 'dentro' ? 'bg-blue-200 text-blue-800' :
                              ms.toolsStatus === 'devolvido' ? 'bg-emerald-200 text-emerald-800' :
                              'bg-zinc-200 text-zinc-800'
                            }`}>
                              {ms.toolsStatus === 'dentro' ? 'DENTRO DA UNIDADE' : 
                               ms.toolsStatus === 'devolvido' ? 'BAIXA DADA (DEVOLVIDO)' : 
                               'FORA DA UNIDADE'}
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Status do Agendamento</p>
                            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              ms.status === 'concluido' ? 'bg-emerald-200 text-emerald-800' :
                              ms.status === 'em_andamento' ? 'bg-blue-200 text-blue-800' :
                              'bg-amber-200 text-amber-800'
                            }`}>
                              {ms.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="md:col-span-2 pt-4 border-t border-emerald-100/50">
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (!ms.validatedByChief) {
                                      setValidatingScheduleId(ms.id);
                                      setValidationRole('chief');
                                    }
                                  }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    ms.validatedByChief 
                                      ? 'bg-emerald-100 text-emerald-700 cursor-default' 
                                      : 'bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  <ShieldCheck className={`h-3 w-3 ${ms.validatedByChief ? 'text-emerald-500' : 'text-emerald-300'}`} />
                                  {ms.validatedByChief ? 'Validado pelo Chefe' : 'Validar Chefe'}
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (!ms.validatedByDirector) {
                                      setValidatingScheduleId(ms.id);
                                      setValidationRole('director');
                                    }
                                  }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    ms.validatedByDirector 
                                      ? 'bg-emerald-100 text-emerald-700 cursor-default' 
                                      : 'bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  <ShieldCheck className={`h-3 w-3 ${ms.validatedByDirector ? 'text-emerald-500' : 'text-emerald-300'}`} />
                                  {ms.validatedByDirector ? 'Validado pelo Diretor' : 'Validar Diretor'}
                                </button>
                              </div>

                              {ms.validatedByChief && ms.validatedByDirector && (
                                <button
                                  onClick={() => generatePDF(ms, order)}
                                  className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
                                >
                                  <Printer className="h-3 w-3" />
                                  Gerar Autorização (PDF)
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-row md:flex-col justify-end md:justify-start gap-4">
                    <button 
                      onClick={() => setSchedulingOrderId(order.id)}
                      className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 p-4 rounded-2xl transition-all shadow-sm group"
                      title="Agendar Manutenção"
                    >
                      <CalendarPlus className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={() => handleEdit(order)}
                      className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 p-4 rounded-2xl transition-all shadow-sm group"
                      title="Editar Solicitação"
                    >
                      <Edit3 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setDeletingId(order.id)}
                      className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 p-4 rounded-2xl transition-all shadow-sm group"
                      title="Excluir Solicitação"
                    >
                      <Trash2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white py-20 rounded-[3rem] shadow-sm border border-gray-200 text-center">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest italic">Nenhuma ordem de serviço localizada</h3>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && editForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter italic">Editar Ordem de Serviço</h3>
              <button 
                onClick={() => { setEditingId(null); setEditForm(null); setEditScheduleForm(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prioridade (Pós-Inspeção)</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="PENDENTE">Aguardando Inspeção</option>
                    <option value="ALTA">ALTA</option>
                    <option value="MÉDIA">MÉDIA</option>
                    <option value="BAIXA">BAIXA</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status do Serviço</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Etapa do Projeto</label>
                  <select
                    value={editForm.projectStage || ''}
                    onChange={(e) => setEditForm({ ...editForm, projectStage: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Não definida</option>
                    <option value="1_aquisicao_material">1ª Etapa: Aquisição de Material</option>
                    <option value="2_disponibilidade_mao_obra">2ª Etapa: Disponibilidade de Mão de Obra</option>
                    <option value="3_em_execucao">3ª Etapa: Em Execução</option>
                    <option value="4_finalizada">4ª Etapa: Finalizada</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data de Atualização</label>
                  <input
                    type="date"
                    value={editForm.updatedAt?.split('T')[0] || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditForm({ ...editForm, updatedAt: new Date(e.target.value).toISOString() })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações da Inspeção / Execução</label>
                <textarea
                  rows={4}
                  value={editForm.inspectionObservations || ''}
                  onChange={(e) => setEditForm({ ...editForm, inspectionObservations: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="Adicione detalhes sobre a inspeção ou progresso do serviço..."
                />
              </div>

              {editScheduleForm && (
                <div className="pt-6 border-t border-gray-100 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Editar Agendamento de Manutenção</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data do Serviço</label>
                      <input
                        type="date"
                        value={editScheduleForm.date}
                        onChange={(e) => setEditScheduleForm({ ...editScheduleForm, date: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Horário Previsto</label>
                      <input
                        type="time"
                        value={editScheduleForm.time}
                        onChange={(e) => setEditScheduleForm({ ...editScheduleForm, time: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Local da Manutenção</label>
                      <input
                        type="text"
                        value={editScheduleForm.location}
                        onChange={(e) => setEditScheduleForm({ ...editScheduleForm, location: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                        placeholder="Ex: Bloco A, Sala 203..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mão de Obra (PPLs)</label>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="relative group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-emerald-300 group-focus-within:text-emerald-500 transition-colors">
                            PPL {i + 1}
                          </span>
                          <input
                            type="text"
                            value={editScheduleForm.ppls?.[i] || ''}
                            onChange={(e) => {
                              const newPpls = [...(editScheduleForm.ppls || Array(5).fill(''))];
                              newPpls[i] = e.target.value;
                              setEditScheduleForm({ ...editScheduleForm, ppls: newPpls });
                            }}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-3 py-2.5 text-[11px] font-bold focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-gray-300"
                            placeholder="Nome do PPL..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Inventário de Ferramentas / Materiais</label>
                      <button 
                        type="button"
                        onClick={() => setEditScheduleForm({ ...editScheduleForm, tools: Array(25).fill('') })}
                        className="text-[8px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors"
                      >
                        Limpar Tudo
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {editScheduleForm.tools?.map((tool, index) => (
                        <div key={index} className="relative group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-gray-300 group-focus-within:text-emerald-400 transition-colors">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <input
                            type="text"
                            value={tool}
                            onChange={(e) => {
                              const newTools = [...(editScheduleForm.tools || Array(25).fill(''))];
                              newTools[index] = e.target.value;
                              setEditScheduleForm({ ...editScheduleForm, tools: newTools });
                            }}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-8 pr-3 py-2 text-[11px] font-bold focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-gray-300"
                            placeholder="Descrever item..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações do Agendamento</label>
                      <textarea
                        rows={4}
                        value={editScheduleForm.toolsNeeded}
                        onChange={(e) => setEditScheduleForm({ ...editScheduleForm, toolsNeeded: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                        placeholder="Outras informações importantes sobre as ferramentas ou o serviço..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Autorização de Saída (PDF)</label>
                      <div className="relative h-[116px]">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditScheduleForm({ ...editScheduleForm, exitAuthorizationUrl: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`w-full h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${
                          editScheduleForm.exitAuthorizationUrl 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                            : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-emerald-300'
                        }`}>
                          {editScheduleForm.exitAuthorizationUrl ? (
                            <>
                              <FileText className="h-8 w-8 mb-2" />
                              <p className="text-[10px] font-black uppercase tracking-widest">PDF Carregado</p>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditScheduleForm({ ...editScheduleForm, exitAuthorizationUrl: '' });
                                }}
                                className="mt-1 text-[8px] font-black text-red-500 hover:text-red-700 uppercase"
                              >
                                Remover
                              </button>
                            </>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 mb-2" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Clique ou arraste o PDF</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
              <button 
                onClick={() => { setEditingId(null); setEditForm(null); setEditScheduleForm(null); }}
                className="bg-white hover:bg-gray-100 text-gray-600 font-black py-3 px-8 rounded-2xl text-xs uppercase transition-all flex items-center gap-2 border border-gray-200"
              >
                <X className="h-4 w-4" /> Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-8 rounded-2xl text-xs uppercase transition-all shadow-lg flex items-center gap-2"
              >
                <Save className="h-4 w-4" /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-gray-500 font-medium">Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button 
                onClick={() => setDeletingId(null)}
                className="flex-1 py-4 text-sm font-black text-gray-500 uppercase hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  await onDelete(deletingId);
                  setDeletingId(null);
                }}
                className="flex-1 py-4 text-sm font-black text-red-600 uppercase hover:bg-red-50 transition-colors border-l border-gray-100"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {validatingScheduleId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Validação de Segurança</h3>
              <p className="text-sm text-gray-500 font-medium mb-6">
                Insira a senha do {validationRole === 'chief' ? 'Chefe Walter Rodrigues Junior' : 'Diretor Alfredo Guilherme Lopes'} para validar esta autorização.
              </p>
              
              <input
                type="password"
                value={validationPassword}
                onChange={(e) => setValidationPassword(e.target.value)}
                placeholder="Digite a senha..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-center text-lg font-black tracking-[0.5em] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
              />
            </div>
            <div className="flex border-t border-gray-100">
              <button 
                onClick={() => {
                  setValidatingScheduleId(null);
                  setValidationRole(null);
                  setValidationPassword('');
                }}
                className="flex-1 py-5 text-xs font-black text-gray-500 uppercase hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleValidate}
                className="flex-1 py-5 text-xs font-black text-indigo-600 uppercase hover:bg-indigo-50 transition-colors border-l border-gray-100"
              >
                Validar Assinatura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {schedulingOrderId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="text-2xl font-black text-emerald-950 uppercase tracking-tighter italic">Agendar Manutenção</h3>
              <button 
                onClick={() => setSchedulingOrderId(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleScheduleSubmit} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Seção 1: Informações Gerais */}
              <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest">Informações do Agendamento</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data da Manutenção</label>
                    <input
                      type="date"
                      required
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Horário Previsto</label>
                    <input
                      type="time"
                      required
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Local da Manutenção</label>
                    <input
                      type="text"
                      required
                      value={scheduleForm.location}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
                      placeholder="Ex: Bloco A, Sala 102"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Responsável pelo Acompanhamento</label>
                    <input
                      type="text"
                      required
                      value={scheduleForm.accompanyingPerson}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, accompanyingPerson: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
                      placeholder="Nome do responsável"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mão de Obra (PPLs)</label>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {Array(5).fill(0).map((_, i) => (
                      <div key={i} className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-emerald-300 group-focus-within:text-emerald-500 transition-colors">
                          PPL {i + 1}
                        </span>
                        <input
                          type="text"
                          value={scheduleForm.ppls?.[i] || ''}
                          onChange={(e) => {
                            const newPpls = [...(scheduleForm.ppls || Array(5).fill(''))];
                            newPpls[i] = e.target.value;
                            setScheduleForm({ ...scheduleForm, ppls: newPpls });
                          }}
                          className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-3 py-2.5 text-[11px] font-bold focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-gray-300"
                          placeholder="Nome do PPL..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seção 2: Inventário de Ferramentas */}
              <div className="bg-emerald-50/30 p-8 rounded-[40px] border border-emerald-100/50 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-200/50 rounded-2xl flex items-center justify-center shadow-sm">
                      <Wrench className="h-6 w-6 text-emerald-700" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-emerald-900 uppercase tracking-tighter italic leading-none">Inventário de Ferramentas</h4>
                      <p className="text-[10px] font-bold text-emerald-600/70 uppercase mt-1 tracking-widest">Controle de entrada e saída (Máx. 25 itens)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScheduleForm({ ...scheduleForm, tools: Array(25).fill('') })}
                    className="text-[10px] font-black text-emerald-700 uppercase hover:bg-emerald-100 transition-all bg-white px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-2"
                  >
                    <Trash2 className="h-3 w-3" /> Limpar Tudo
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-1">
                  {Array(25).fill(0).map((_, i) => (
                    <div key={i} className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-300 group-focus-within:text-emerald-500 transition-colors">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <input
                        type="text"
                        value={scheduleForm.tools?.[i] || ''}
                        onChange={(e) => {
                          const newTools = [...(scheduleForm.tools || Array(25).fill(''))];
                          newTools[i] = e.target.value;
                          setScheduleForm({ ...scheduleForm, tools: newTools });
                        }}
                        className="w-full bg-white border border-gray-100 rounded-2xl pl-10 pr-4 py-3.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm placeholder:text-gray-300 hover:border-emerald-200"
                        placeholder={`Item ${i + 1}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações Adicionais</label>
                  <textarea
                    rows={4}
                    value={scheduleForm.toolsNeeded}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, toolsNeeded: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                    placeholder="Outras informações importantes sobre as ferramentas ou o serviço..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Autorização de Saída (PDF)</label>
                  <div className="relative h-[116px]">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setScheduleForm({ ...scheduleForm, exitAuthorizationUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`w-full h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${
                      scheduleForm.exitAuthorizationUrl 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-emerald-300'
                    }`}>
                      {scheduleForm.exitAuthorizationUrl ? (
                        <>
                          <FileText className="h-8 w-8 mb-2" />
                          <p className="text-[10px] font-black uppercase tracking-widest">PDF Carregado</p>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setScheduleForm({ ...scheduleForm, exitAuthorizationUrl: '' });
                            }}
                            className="mt-1 text-[8px] font-black text-red-500 hover:text-red-700 uppercase"
                          >
                            Remover
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mb-2" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Clique ou arraste o PDF</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setSchedulingOrderId(null)}
                  className="bg-white hover:bg-gray-100 text-gray-600 font-black py-3 px-8 rounded-2xl text-xs uppercase transition-all flex items-center gap-2 border border-gray-200"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-8 rounded-2xl text-xs uppercase transition-all shadow-lg flex items-center gap-2"
                >
                  <Save className="h-4 w-4" /> Salvar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServiceOrder;
