
import React, { useState, useMemo, useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, Plus, Trash2, FileText, Barcode as BarcodeIcon, FileIcon, Eye, Search, Save, Database, Calendar, X, Wrench, Pencil, History, ArrowRightLeft, Check, AlertTriangle, QrCode } from 'lucide-react';
import { getDatabase, ref, set, get, push, remove, onValue } from 'firebase/database';
import { app } from '../firebaseConfig';
import { HOLIDAYS_2026 } from '../constants';
import type { Supplier, WarehouseMovement, ThirdPartyEntryLog, AcquisitionItem, PublicInfo, StandardMenu, DailyMenus, Delivery } from '../types';
import AdminInvoices from './AdminInvoices';
import AgendaChegadas from './AgendaChegadas';
import { Html5Qrcode } from 'html5-qrcode';
import WarehouseMovementForm from './WarehouseMovementForm';
import AdminWarehouseLog from './AdminWarehouseLog';
import ValidityAnalysisPanel from './ValidityAnalysisPanel';
import SynchronizationModule from './SynchronizationModule';
import AdminStandardMenu from './AdminStandardMenu';
import AdminCleaningLog from './AdminCleaningLog';
import { DirectorPerCapitaTable } from './DirectorPerCapitaTable';
import { getWeekNumber } from '../lib/supplierUtils';
import { ensureArray } from '../lib/utils';

interface AlmoxarifadoDashboardProps {
    currentUser: { name: string; cpf: string; role: string };
    suppliers: Supplier[];
    warehouseLog: WarehouseMovement[];
    onLogout: () => void;
    onRegisterEntry: (payload: any) => Promise<{ success: boolean; message: string }>;
    onRegisterWithdrawal: (payload: any) => Promise<{ success: boolean; message: string }>;
    onResetExits: () => Promise<{ success: boolean; message: string }>;
    onReopenInvoice: (supplierCpf: string, invoiceNumber: string) => Promise<void>;
    onDeleteInvoice: (supplierCpf: string, invoiceNumber: string) => Promise<any>;
    onDeleteDelivery: (supplierCpf: string, deliveryId: string) => Promise<{ success: boolean; message?: string }>;
    onUpdateDelivery: (supplierCpf: string, deliveryId: string, updates: Partial<Delivery>) => Promise<{ success: boolean; message?: string }>;
    onSaveInvoice: (supplierCpf: string, deliveryIds: string[], invoiceNumber: string, invoiceUrl: string, updatedDeliveries: Delivery[], invoiceDate?: string) => Promise<void>;
    onUpdateInvoiceItems: (supplierCpf: string, invoiceNumber: string, items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string; barcode?: string }[], barcode?: string, newInvoiceNumber?: string, newDate?: string, receiptTermNumber?: string, invoiceDate?: string, pd?: string, supplierNameHint?: string) => Promise<{ success: boolean; message?: string }>;
    onUpdateInvoiceUrl: (supplierCpf: string, invoiceNumber: string, invoiceUrl: string) => Promise<{ success: boolean; message?: string }>;
    onMarkInvoiceAsOpened: (supplierCpf: string, invoiceNumber: string) => Promise<{ success: boolean }>;
    onManualInvoiceEntry: (supplierCpf: string, date: string, invoiceNumber: string, items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string; barcode?: string }[], barcode?: string, receiptTermNumber?: string, invoiceDate?: string, pd?: string, type?: 'entrada' | 'saída') => Promise<{ success: boolean; message?: string }>;
    onDeleteWarehouseEntry?: (logEntry: WarehouseMovement) => Promise<{ success: boolean; message: string }>;
    onUpdateWarehouseEntry?: (updatedEntry: WarehouseMovement) => Promise<{ success: boolean; message: string }>;
    thirdPartyEntries: ThirdPartyEntryLog[];
    perCapitaConfig?: any;
    acquisitionItems?: AcquisitionItem[];
    publicInfoList: PublicInfo[];
    onRegisterThirdPartyEntry: (log: Omit<ThirdPartyEntryLog, 'id'>) => Promise<{ success: boolean; message: string }>;
    onUpdateThirdPartyEntry: (log: ThirdPartyEntryLog) => Promise<{ success: boolean; message: string }>;
    onDeleteThirdPartyEntry: (id: string) => Promise<void>;
    standardMenu: StandardMenu;
    dailyMenus: DailyMenus;
    onUpdateStandardMenu: (menu: StandardMenu) => Promise<void | { success: boolean; message: string }>;
    onUpdateDailyMenu: (menus: DailyMenus) => Promise<void | { success: boolean; message: string }>;
    directorPerCapita?: any;
    onUpdateDirectorPerCapita?: any;
    cleaningLogs?: any[];
    financialRecords?: any[];
    onRegisterCleaningLog?: (log: any) => Promise<{ success: boolean; message: string }>;
    onDeleteCleaningLog?: (id: string) => Promise<any>;
    temperatureLogs?: any[];
    onRegisterTemperatureLog?: (log: any) => Promise<{ success: boolean; message: string }>;
    onDeleteTemperatureLog?: (id: string) => Promise<any>;
    [key: string]: any;
}

const Barcode: React.FC<{ value: string }> = ({ value }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (svgRef.current && value) {
            try {
                JsBarcode(svgRef.current, value, {
                    format: "CODE128",
                    width: 1.5,
                    height: 30,
                    displayValue: true,
                    fontSize: 12,
                    margin: 0
                });
            } catch (e) {
                console.error("Barcode generation error:", e);
            }
        }
    }, [value]);

    return <svg ref={svgRef}></svg>;
};

const MONTHS_PT = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const YEARS = [2025, 2026, 2027];

const getFirstBusinessDayOfMonth = (monthIndex: number, year: number) => {
    const date = new Date(year, monthIndex, 1);
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
    }
    return date;
};

const cleanCpf = (c: any) => String(c || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
const matchCpf = (a: any, b: any) => {
    const ca = cleanCpf(a);
    const cb = cleanCpf(b);
    if (!ca || !cb) return false;
    return ca === cb || (ca.length === 11 && cb.length === 14 && cb.startsWith(ca)) || (cb.length === 11 && ca.length === 14 && ca.startsWith(cb));
};

const AlmoxarifadoDashboard: React.FC<AlmoxarifadoDashboardProps> = ({ 
    currentUser,
    suppliers, 
    warehouseLog, 
    onLogout, 
    onRegisterEntry,
    onRegisterWithdrawal, 
    onReopenInvoice,
    onDeleteInvoice,
    onDeleteDelivery,
    onUpdateDelivery,
    onSaveInvoice,
    onUpdateInvoiceItems,
    onUpdateInvoiceUrl,
    onManualInvoiceEntry,
    onMarkInvoiceAsOpened,
    onDeleteWarehouseEntry,
    onUpdateWarehouseEntry,
    thirdPartyEntries,
    perCapitaConfig,
    acquisitionItems = [],
    standardMenu,
    dailyMenus,
    onUpdateDailyMenu,
    directorPerCapita,
    onUpdateDirectorPerCapita,
    onUpdateThirdPartyEntry,
    cleaningLogs = [],
    financialRecords = [],
    onRegisterCleaningLog,
    onDeleteCleaningLog,
    temperatureLogs = [],
    onRegisterTemperatureLog,
    onDeleteTemperatureLog
}) => {
    const [activeTab, setActiveTab] = useState<string>('history');
    const [receiptSupplierCpf, setReceiptSupplierCpf] = useState('');
    const [receiptInvoice, setReceiptInvoice] = useState('');
    const [receiptProcessoSei, setReceiptProcessoSei] = useState('');
    
    // Manual Receipt State
    const [manualReceipt, setManualReceipt] = useState<any>({
        supplierName: '',
        supplierCpf: '',
        processoSei: '',
        invoiceNumber: '',
        receiptTermNumber: '',
        invoiceDate: '',
        receiptDate: '',
        barcode: '',
        items: [{ name: '', quantity: 0, unit: 'UN', totalValue: 0 }]
    });
    
    // New states for month filtering and Cronograma
    const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS_PT[new Date().getMonth()]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [cronogramaType, setCronogramaType] = useState<'PPAIS' | 'ESTOCÁVEIS' | 'PERECÍVEIS'>('PPAIS');
    const [selectedCronogramaSupplier, setSelectedCronogramaSupplier] = useState('');
    const [cronogramaSupplierSearch, setCronogramaSupplierSearch] = useState('');
    const [invoiceSearch, setInvoiceSearch] = useState('');

    // --- Sub Aba de Cronograma Manual ---
    const [cronogramaSubTab, setCronogramaSubTab] = useState<'auto' | 'manual'>('auto');
    const [manualCronSupplierSearch, setManualCronSupplierSearch] = useState('');
    const [manualCronSupplierName, setManualCronSupplierName] = useState('');
    const [manualCronSupplierCpfCnpj, setManualCronSupplierCpfCnpj] = useState('');
    const [manualCronSupplierAddress, setManualCronSupplierAddress] = useState('');
    const [manualCronMonth, setManualCronMonth] = useState<string>(MONTHS_PT[new Date().getMonth()]);
    const [manualCronYear, setManualCronYear] = useState<number>(new Date().getFullYear());
    const [manualCronItems, setManualCronItems] = useState<any[]>([]);
    const [isLoadingManualCron, setIsLoadingManualCron] = useState(false);
    const [isSavingManualCron, setIsSavingManualCron] = useState(false);

    // --- Câmaras Frias & Ferramentas States ---
    const [camaraFriaSubTab, setCamaraFriaSubTab] = useState<'temperature' | 'cleaning' | 'tools'>('temperature');
    const [tempDate, setTempDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [tempPeriod, setTempPeriod] = useState<'MANHÃ' | 'TARDE'>('MANHÃ');
    const [tempTime, setTempTime] = useState<string>(new Date().toTimeString().slice(0, 5));
    const [tempValue, setTempValue] = useState<string>('');
    const [tempChamber, setTempChamber] = useState<'Câmara Fria de Congelados' | 'Câmara Fria de Resfriados'>('Câmara Fria de Resfriados');
    const [tempResponsible, setTempResponsible] = useState<string>('');
    const [tempObservations, setTempObservations] = useState<string>('');
    const [isSavingTemp, setIsSavingTemp] = useState<boolean>(false);
    const [tempFilterMonth, setTempFilterMonth] = useState<string>(MONTHS_PT[new Date().getMonth()]);
    const [tempFilterYear, setTempFilterYear] = useState<number>(new Date().getFullYear());

    // --- Controle de Ferramentas States & Database listeners ---
    const [tools, setTools] = useState<any[]>([]);
    const [toolMovements, setToolMovements] = useState<any[]>([]);
    const [loadingTools, setLoadingTools] = useState(true);
    const [toolsView, setToolsView] = useState<'inventory' | 'movement' | 'logs'>('inventory');

    const [newTool, setNewTool] = useState({
        name: '',
        model: '',
        registerNumber: '',
        toolCode: '',
        category: 'MANUAL', // MANUAL, ELÉTRICA, MEDIÇÃO, EPI, OUTROS
        location: '',
        status: 'DISPONÍVEL'
    });
    const [editingToolId, setEditingToolId] = useState<string | null>(null);
    const [isToolModalOpen, setIsToolModalOpen] = useState(false);

    const [newMovement, setNewMovement] = useState({
        toolId: '',
        type: 'RETIRADA' as 'RETIRADA' | 'DEVOLUÇÃO',
        personName: '',
        personCpf: '',
        responsible: currentUser?.name || '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        expectedReturnDate: '',
        condition: 'BOM', // EXCELENTE, BOM, REGULAR, DANIFICADO
        observations: ''
    });

    const [toolSearch, setToolSearch] = useState('');
    const [toolStatusFilter, setToolStatusFilter] = useState('TODOS');
    const [toolMovementSearch, setToolMovementSearch] = useState('');
    const [toolBarcodeQuery, setToolBarcodeQuery] = useState('');
    const [toolScanFeedback, setToolScanFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [isToolScannerActive, setIsToolScannerActive] = useState(false);

    useEffect(() => {
        const db = getDatabase(app);
        const toolsRef = ref(db, 'tools');
        const movementsRef = ref(db, 'toolMovements');

        const unsubTools = onValue(toolsRef, (snapshot) => {
            const data = snapshot.val();
            const list = data ? Object.entries(data).map(([key, val]: any) => ({
                id: key,
                ...val
            })) : [];
            setTools(list);
            setLoadingTools(false);
        });

        const unsubMovements = onValue(movementsRef, (snapshot) => {
            const data = snapshot.val();
            const list = data ? Object.entries(data).map(([key, val]: any) => ({
                id: key,
                ...val
            })) : [];
            list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setToolMovements(list);
        });

        return () => {
            unsubTools();
            unsubMovements();
        };
    }, []);

    useEffect(() => {
        let html5QrCode: Html5Qrcode | null = null;
        let isStopped = false;

        if (isToolScannerActive) {
            const timer = setTimeout(() => {
                try {
                    const element = document.getElementById("tool-qr-reader");
                    if (!element) return;

                    html5QrCode = new Html5Qrcode("tool-qr-reader");
                    
                    const startScanner = async () => {
                        try {
                            await html5QrCode?.start(
                                { facingMode: "environment" },
                                {
                                    fps: 10,
                                    qrbox: { width: 220, height: 220 }
                                },
                                (decodedText) => {
                                    handleScanBarcode(decodedText);
                                    setIsToolScannerActive(false);
                                    if (html5QrCode && html5QrCode.isScanning && !isStopped) {
                                        isStopped = true;
                                        html5QrCode.stop().catch(err => console.warn("Erro ao parar camera:", err));
                                    }
                                },
                                () => {}
                            );
                        } catch (err) {
                            console.warn("Failed with environment camera, trying user camera...", err);
                            if (isStopped) return;
                            try {
                                await html5QrCode?.start(
                                    { facingMode: "user" },
                                    {
                                        fps: 10,
                                        qrbox: { width: 220, height: 220 }
                                    },
                                    (decodedText) => {
                                        handleScanBarcode(decodedText);
                                        setIsToolScannerActive(false);
                                        if (html5QrCode && html5QrCode.isScanning && !isStopped) {
                                            isStopped = true;
                                            html5QrCode.stop().catch(stopErr => console.warn("Erro:", stopErr));
                                        }
                                    },
                                    () => {}
                                );
                            } catch (fallbackErr) {
                                console.error("Camera fallback failed too:", fallbackErr);
                                try {
                                    const devices = await Html5Qrcode.getCameras();
                                    if (devices && devices.length > 0 && !isStopped) {
                                        const cameraId = devices[devices.length - 1].id;
                                        await html5QrCode?.start(
                                            cameraId,
                                            { fps: 10, qrbox: { width: 220, height: 220 } },
                                            (decodedText) => {
                                                handleScanBarcode(decodedText);
                                                setIsToolScannerActive(false);
                                                if (html5QrCode && html5QrCode.isScanning && !isStopped) {
                                                    isStopped = true;
                                                    html5QrCode.stop().catch(() => {});
                                                }
                                            },
                                            () => {}
                                        );
                                    } else {
                                        setToolScanFeedback({ type: 'error', message: "Nenhuma câmera encontrada." });
                                    }
                                } catch (_deviceErr) {
                                    setToolScanFeedback({ type: 'error', message: "Não foi possível acessar a câmera do dispositivo." });
                                }
                            }
                        }
                    };

                    startScanner();
                } catch (e) {
                    console.error("Camera scanner instance error:", e);
                }
            }, 300);

            return () => {
                clearTimeout(timer);
                isStopped = true;
                if (html5QrCode) {
                    const stopScanner = async () => {
                        try {
                            if (html5QrCode && html5QrCode.isScanning) {
                                await html5QrCode.stop();
                            }
                        } catch (err) {
                            console.warn("Erro ao parar camera no cleanup:", err);
                        }
                    };
                    stopScanner();
                }
            };
        }
    }, [isToolScannerActive]);

    const handleSaveTool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTool.name || !newTool.registerNumber || !newTool.toolCode) {
            alert('Por favor, preencha o nome, número de cadastro e o código da ferramenta.');
            return;
        }

        const barcodeVal = `${newTool.registerNumber.trim().toUpperCase()}-${newTool.toolCode.trim().toUpperCase()}`;

        try {
            const db = getDatabase(app);
            const toolData = {
                name: newTool.name.toUpperCase().trim(),
                model: newTool.model.toUpperCase().trim() || 'NÃO INFORMADO',
                registerNumber: newTool.registerNumber.toUpperCase().trim(),
                toolCode: newTool.toolCode.toUpperCase().trim(),
                barcode: barcodeVal,
                category: newTool.category,
                location: newTool.location.toUpperCase().trim() || 'ALMOXARIFADO',
                status: newTool.status,
                createdAt: new Date().toISOString(),
                lastMovement: editingToolId ? 'EDITADO' : 'CADASTRO INICIAL'
            };

            if (editingToolId) {
                await set(ref(db, `tools/${editingToolId}`), {
                    ...toolData,
                    id: editingToolId
                });
                alert('Ferramenta atualizada com sucesso!');
            } else {
                const newToolRef = push(ref(db, 'tools'));
                await set(newToolRef, {
                    ...toolData,
                    id: newToolRef.key
                });
                alert('Ferramenta cadastrada com sucesso!');
            }

            setNewTool({
                name: '',
                model: '',
                registerNumber: '',
                toolCode: '',
                category: 'MANUAL',
                location: '',
                status: 'DISPONÍVEL'
            });
            setEditingToolId(null);
            setIsToolModalOpen(false);
        } catch (err) {
            console.error("Error saving tool:", err);
            alert("Erro ao salvar ferramenta.");
        }
    };

    const handleDeleteTool = async (id: string) => {
        if (!window.confirm('Tem certeza de que deseja excluir esta ferramenta? Isso removerá o registro permanentemente.')) {
            return;
        }
        try {
            const db = getDatabase(app);
            await remove(ref(db, `tools/${id}`));
            alert('Ferramenta removida com sucesso!');
        } catch (err) {
            console.error("Error deleting tool:", err);
            alert("Erro ao remover ferramenta.");
        }
    };

    const handleScanBarcode = (scannedValue: string) => {
        const val = scannedValue.trim().toUpperCase();
        if (!val) return;

        // Try to find the tool
        const matchedTool = tools.find(t => {
            const toolBarcode = String(t.barcode || '').trim().toUpperCase();
            const toolReg = String(t.registerNumber || '').trim().toUpperCase();
            const toolCode = String(t.toolCode || '').trim().toUpperCase();
            return toolBarcode === val || toolReg === val || toolCode === val;
        });

        if (matchedTool) {
            // Determine operation type automatically:
            // If the tool is DISPONÍVEL -> it's a RETIRADA (Exit)
            // If the tool is EMPRESTADO -> it's a DEVOLUÇÃO (Entry)
            let autoType: 'RETIRADA' | 'DEVOLUÇÃO' = 'RETIRADA';
            let messageExtra = '';

            if (matchedTool.status === 'DISPONÍVEL') {
                autoType = 'RETIRADA';
                messageExtra = 'Identificado para SAÍDA (RETIRADA)';
            } else if (matchedTool.status === 'EMPRESTADO') {
                autoType = 'DEVOLUÇÃO';
                messageExtra = 'Identificado para ENTRADA (DEVOLUÇÃO)';
            } else {
                autoType = 'DEVOLUÇÃO';
                messageExtra = `Atenção: Status "${matchedTool.status}". Defina a operação desejada.`;
            }

            setNewMovement(prev => ({
                ...prev,
                toolId: matchedTool.id,
                type: autoType,
            }));

            setToolScanFeedback({
                type: matchedTool.status === 'DANIFICADO' || matchedTool.status === 'MANUTENÇÃO' ? 'info' : 'success',
                message: `✅ SUCESSO: ${matchedTool.name} (CAD: ${matchedTool.registerNumber}) selecionada! ${messageExtra}.`
            });

            // Focus on collaborator name input
            setTimeout(() => {
                const nameInput = document.getElementById('tool-movement-person-name');
                if (nameInput) {
                    nameInput.focus();
                }
            }, 100);
        } else {
            setToolScanFeedback({
                type: 'error',
                message: `❌ ERRO: Nenhuma ferramenta encontrada com o código "${val}".`
            });
        }
    };

    const handleRegisterToolMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMovement.toolId || !newMovement.personName) {
            alert('Por favor, selecione a ferramenta e informe o nome do colaborador.');
            return;
        }

        const selectedTool = tools.find(t => t.id === newMovement.toolId);
        if (!selectedTool) return;

        try {
            const db = getDatabase(app);
            const movementRef = push(ref(db, 'toolMovements'));
            const timestamp = Date.now();

            const movementData = {
                id: movementRef.key,
                toolId: selectedTool.id,
                toolName: selectedTool.name,
                toolCode: selectedTool.toolCode,
                registerNumber: selectedTool.registerNumber,
                type: newMovement.type,
                personName: newMovement.personName.toUpperCase().trim(),
                personCpf: newMovement.personCpf.trim() || 'NÃO INFORMADO',
                responsible: newMovement.responsible.toUpperCase().trim(),
                date: newMovement.date,
                time: newMovement.time,
                expectedReturnDate: newMovement.type === 'RETIRADA' ? newMovement.expectedReturnDate : '',
                condition: newMovement.type === 'DEVOLUÇÃO' ? newMovement.condition : '',
                observations: newMovement.observations.trim() || 'SEM OBSERVAÇÕES',
                timestamp: timestamp
            };

            await set(movementRef, movementData);

            const nextStatus = newMovement.type === 'RETIRADA' 
                ? 'EMPRESTADO' 
                : (newMovement.condition === 'DANIFICADO' ? 'DANIFICADO' : (newMovement.condition === 'NECESSITA MANUTENÇÃO' ? 'MANUTENÇÃO' : 'DISPONÍVEL'));

            await set(ref(db, `tools/${selectedTool.id}`), {
                ...selectedTool,
                status: nextStatus,
                lastMovement: `${newMovement.type} POR ${newMovement.personName.toUpperCase()} EM ${newMovement.date} às ${newMovement.time}`
            });

            alert(`Movimentação de ${newMovement.type.toLowerCase()} registrada com sucesso!`);

            setNewMovement(prev => ({
                ...prev,
                toolId: '',
                personName: '',
                personCpf: '',
                expectedReturnDate: '',
                condition: 'BOM',
                observations: ''
            }));
        } catch (err) {
            console.error("Error recording movement:", err);
            alert("Erro ao registrar movimentação.");
        }
    };

    const handlePrintToolLabel = (tool: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
            <head>
                <title>Etiqueta de Ferramenta - ${tool.registerNumber}</title>
                <style>
                    @page { size: 80mm 50mm; margin: 0; }
                    body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 10px; background-color: #fff; color: #000; text-align: center; }
                    .header { font-size: 8pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase; }
                    .title { font-size: 10pt; font-weight: bold; margin: 2px 0; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                    .info { font-size: 7.5pt; margin-bottom: 5px; display: flex; justify-content: space-around; }
                    .barcode-container { display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 5px; }
                    .barcode-container svg { max-width: 100%; height: auto; }
                    .footer { font-size: 6pt; border-top: 1px dashed #000; padding-top: 2px; margin-top: 5px; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="header">C.F.A. TAIÚVA - ALMOXARIFADO</div>
                <div class="title">${tool.name}</div>
                <div class="info">
                    <span><strong>CAD:</strong> ${tool.registerNumber}</span>
                    <span><strong>CÓD:</strong> ${tool.toolCode}</span>
                </div>
                <div class="info">
                    <span><strong>LOC:</strong> ${tool.location}</span>
                </div>
                <div class="barcode-container">
                    <svg id="barcode"></svg>
                </div>
                <div class="footer">Patrimônio / Controle de Ferramentas</div>

                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <script>
                    window.onload = function() {
                        try {
                            JsBarcode("#barcode", "${tool.barcode}", {
                                format: "CODE128",
                                width: 1.8,
                                height: 35,
                                displayValue: true,
                                fontSize: 9,
                                margin: 0
                            });
                        } catch(e) {
                            console.error('Barcode error:', e);
                        }
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handlePrintToolsReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
            <head>
                <title>Relatório de Movimentação de Ferramentas</title>
                <style>
                    @page { size: A4 portrait; margin: 15mm; }
                    body { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.3; color: #000; margin: 0; padding: 0; }
                    h2 { text-align: center; text-transform: uppercase; margin-bottom: 20px; font-size: 14pt; border-bottom: 2px solid #000; padding-bottom: 5px; }
                    .info-header { margin-bottom: 15px; display: flex; justify-content: space-between; font-weight: bold; font-size: 9.5pt; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8pt; text-transform: uppercase; }
                    th, td { border: 1px solid #000; padding: 5px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
                    .type-badge { font-weight: bold; text-align: center; }
                    .text-center { text-align: center; }
                    .footer-signature { margin-top: 50px; display: flex; justify-content: space-around; page-break-inside: avoid; }
                    .sig-line { border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 4px; font-weight: bold; margin-top: 40px; }
                </style>
            </head>
            <body>
                <h2>Relatório de Controle de Entrada/Saída de Ferramentas</h2>
                <div class="info-header">
                    <span>C.F.A. TAIÚVA - ALMOXARIFADO</span>
                    <span>EMISSÃO: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 12%;">DATA/HORA</th>
                            <th style="width: 25%;">FERRAMENTA (REG / CÓD)</th>
                            <th style="width: 10%;">OPERAÇÃO</th>
                            <th style="width: 23%;">COLABORADOR / CPF</th>
                            <th style="width: 15%;">AUTORIZADO POR</th>
                            <th style="width: 15%;">PREV. / ESTADO / OBS.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${toolMovements.length > 0 ? toolMovements.map(log => `
                            <tr>
                                <td class="text-center">${log.date ? new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}<br/>${log.time || ''}</td>
                                <td><strong>${log.toolName || 'FMT'}</strong><br/>CAD: ${log.registerNumber || ''} | CÓD: ${log.toolCode || ''}</td>
                                <td class="type-badge text-center" style="color: ${log.type === 'RETIRADA' ? '#b45309' : '#15803d'}; font-weight: 800;">
                                    ${log.type || ''}
                                </td>
                                <td>${log.personName || ''}<br/><span style="font-size: 7.5pt; color: #444;">CPF: ${log.personCpf || ''}</span></td>
                                <td>${log.responsible || ''}</td>
                                <td style="font-size: 7.5pt;">
                                    ${log.type === 'RETIRADA' ? `PREV. RETORNO: ${log.expectedReturnDate ? new Date(log.expectedReturnDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A'}` : `ESTADO: ${log.condition || 'BOM'}`}
                                    ${log.observations && log.observations !== 'SEM OBSERVAÇÕES' ? `<br/>OBS: ${log.observations}` : ''}
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colSpan="6" style="text-align: center; padding: 20px; font-weight: bold;">Nenhum registro de movimentação encontrado.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
                <div class="footer-signature">
                    <div class="sig-line">
                        Responsável pelo Almoxarifado
                    </div>
                    <div class="sig-line">
                        Diretoria / Supervisão
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filteredCronogramaSuppliers = useMemo(() => {
        const list = (cronogramaType === 'PPAIS' ? (perCapitaConfig?.ppaisProducers || []) : 
                      cronogramaType === 'PERECÍVEIS' ? (perCapitaConfig?.pereciveisSuppliers || []) : 
                      (perCapitaConfig?.estocaveisSuppliers || []));
                      
        let combined = [...list];
        if (cronogramaType === 'ESTOCÁVEIS') {
            const extraSuppliers = ensureArray(suppliers).filter(s => !ensureArray(perCapitaConfig?.estocaveisSuppliers).some((p: any) => matchCpf(p.cpfCnpj || p.cpf, s.cpf)));
            combined = [...combined, ...extraSuppliers];
        }
        
        if (!cronogramaSupplierSearch) return combined;
        const sLower = cronogramaSupplierSearch.toLowerCase();
        return combined.filter((s: any) => 
            (s.name || '').toLowerCase().includes(sLower) || 
            (s.cpf || s.cpfCnpj || '').replace(/\D/g, '').includes(sLower)
        );
    }, [cronogramaType, perCapitaConfig, suppliers, cronogramaSupplierSearch]);

    const cronogramaDetails = useMemo(() => {
        if (!selectedCronogramaSupplier) {
            return {
                supplier: null,
                monthlyItemsList: [],
                totalWeight: 0,
                totalValue: 0,
                firstBusinessDay: new Date()
            };
        }

        const monthIndex = MONTHS_PT.indexOf(selectedMonth);
        const firstBusinessDay = getFirstBusinessDayOfMonth(monthIndex, selectedYear);
        
        const pcSupplier = ensureArray(perCapitaConfig?.ppaisProducers).find((p: any) => (matchCpf(p.cpfCnpj, selectedCronogramaSupplier) || matchCpf(p.cpf, selectedCronogramaSupplier))) ||
                           ensureArray(perCapitaConfig?.pereciveisSuppliers).find((p: any) => (matchCpf(p.cpfCnpj, selectedCronogramaSupplier) || matchCpf(p.cpf, selectedCronogramaSupplier))) ||
                           ensureArray(perCapitaConfig?.estocaveisSuppliers).find((p: any) => (matchCpf(p.cpfCnpj, selectedCronogramaSupplier) || matchCpf(p.cpf, selectedCronogramaSupplier)));

        const mainSupplier = ensureArray(suppliers).find(s => matchCpf(s.cpf, selectedCronogramaSupplier));

        const supplier: any = {
            ...((mainSupplier as any) || {}),
            ...((pcSupplier as any) || {}),
            name: (pcSupplier as any)?.name || (mainSupplier as any)?.name || 'DESCONHECIDO',
            cpfCnpj: (pcSupplier as any)?.cpfCnpj || (mainSupplier as any)?.cpf || selectedCronogramaSupplier,
            address: (pcSupplier as any)?.address || (mainSupplier as any)?.address || ''
        };

        const getDeliveryMonthAndYear = (d: any) => {
            const dateStr = d.date || d.invoiceDate;
            if (!dateStr) return { month: -1, year: -1 };
            
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts[0].length === 4) {
                    return { month: parseInt(parts[1], 10) - 1, year: parseInt(parts[0], 10) };
                }
            }
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts[2] && parts[2].length === 4) {
                    return { month: parseInt(parts[1], 10) - 1, year: parseInt(parts[2], 10) };
                }
            }
            try {
                const parsed = new Date(dateStr + 'T12:00:00');
                return { month: parsed.getMonth(), year: parsed.getFullYear() };
            } catch (e) {
                return { month: -1, year: -1 };
            }
        };

        const cleanCpfCnpj = (s: string) => String(s || '').replace(/\D/g, '');
        const supplierCleanCpf = cleanCpfCnpj(selectedCronogramaSupplier);

        // 1. Get deliveries from supplier.deliveries
        const deliveriesFromSupplier = ensureArray(supplier.deliveries || []);

        // 2. Get deliveries from warehouseLog (which is the direct log of entries)
        const deliveriesFromLog = ensureArray(warehouseLog || []).filter((log: any) => {
            if (!log || log.type !== 'entrada') return false;
            const logCpf = cleanCpfCnpj(log.supplierCpf);
            return (logCpf && logCpf === supplierCleanCpf) || 
                   (log.supplierName && log.supplierName.toUpperCase() === supplier.name.toUpperCase());
        });

        const monthlyItemsList: any[] = [];
        const seenDeliveries = new Set<string>();

        const addUniqueDelivery = (date: string, item: string, kg: number, value: number, invoice: string) => {
            if (!date || !item || kg <= 0) return;
            
            let formattedDate = date;
            if (date.includes('-')) {
                const parts = date.split('-');
                if (parts[0].length === 4) {
                    formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }
            
            const uniqueKey = `${formattedDate}_${item.toUpperCase()}_${kg.toFixed(3)}`;
            if (seenDeliveries.has(uniqueKey)) return;
            seenDeliveries.add(uniqueKey);
            
            const unitPrice = kg > 0 ? (value / kg) : 0;

            // Resolve the week number for the date
            let dateWithWeek = formattedDate;
            if (formattedDate.includes('/')) {
                const parts = formattedDate.split('/');
                const dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12, 0, 0);
                if (!isNaN(dateObj.getTime())) {
                    const weekNo = getWeekNumber(dateObj);
                    dateWithWeek = `${formattedDate} (SEMANA ${weekNo})`;
                }
            }

            // Resolve complete description of the item using contractItems and acquisitionItems
            const nameUpper = item.toUpperCase().trim();
            const contractItems = ensureArray(supplier?.contractItems);
            const matchedContractItem = contractItems.find((ci: any) => ci && (ci.name || ci.itemName || '').toUpperCase().trim() === nameUpper);
            const matchedAcquisitionItem = ensureArray(acquisitionItems).find((ai: any) => ai && (ai.name || '').toUpperCase().trim() === nameUpper);

            let itemFull = nameUpper;
            const mci = matchedContractItem as any;
            const mai = matchedAcquisitionItem as any;
            const comprasCode = mci?.comprasCode || mai?.comprasCode;
            const becCode = mci?.becCode || mai?.becCode;
            const category = mci?.category || mai?.category;

            const codes: string[] = [];
            if (comprasCode) {
                codes.push(`CÓD. COMPRAS: ${comprasCode}`);
            }
            if (becCode) {
                codes.push(`CÓD. BEC: ${becCode}`);
            }
            if (category && category !== 'OUTROS') {
                codes.push(`CATEGORIA: ${category}`);
            }

            if (codes.length > 0) {
                itemFull = `${nameUpper} (${codes.join(' - ')})`;
            }
            
            monthlyItemsList.push({
                date: formattedDate,
                dateWithWeek: dateWithWeek,
                item: item.toUpperCase(),
                itemFull: itemFull,
                kg: kg,
                unitPrice: unitPrice,
                totalValue: value,
                invoiceNumber: invoice
            });
        };

        // Add from supplier deliveries
        deliveriesFromSupplier.forEach((d: any) => {
            if (!d || d.item === 'AGENDAMENTO PENDENTE') return;
            const { month, year } = getDeliveryMonthAndYear(d);
            if (month === monthIndex && year === selectedYear) {
                addUniqueDelivery(
                    d.date || d.invoiceDate,
                    d.item,
                    Number(d.kg || d.quantity || 0),
                    Number(d.value || 0),
                    d.invoiceNumber || ''
                );
            }
        });

        // Add from warehouseLog
        deliveriesFromLog.forEach((log: any) => {
            if (!log) return;
            const { month, year } = getDeliveryMonthAndYear(log);
            if (month === monthIndex && year === selectedYear) {
                addUniqueDelivery(
                    log.date,
                    log.itemName,
                    Number(log.quantity || log.kg || 0),
                    Number(log.value || 0),
                    log.inboundInvoice || log.invoiceNumber || ''
                );
            }
        });

        // Sort by date ascending
        monthlyItemsList.sort((a, b) => {
            const parseDateStr = (str: string) => {
                if (!str) return 0;
                if (str.includes('/')) {
                    const parts = str.split('/');
                    if (parts.length === 3) {
                        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                        return isNaN(d.getTime()) ? 0 : d.getTime();
                    }
                } else if (str.includes('-')) {
                    const d = new Date(str.includes('T') ? str : str + 'T12:00:00');
                    return isNaN(d.getTime()) ? 0 : d.getTime();
                }
                return 0;
            };
            return parseDateStr(a.date) - parseDateStr(b.date);
        });

        const totalWeight = monthlyItemsList.reduce((sum, item) => sum + item.kg, 0);
        const totalValue = monthlyItemsList.reduce((sum, item) => sum + item.totalValue, 0);

        return {
            supplier,
            monthlyItemsList,
            totalWeight,
            totalValue,
            firstBusinessDay
        };
    }, [selectedCronogramaSupplier, selectedMonth, selectedYear, cronogramaType, perCapitaConfig, suppliers, warehouseLog]);

    // --- Manual Cronograma Handlers and Memos ---
    const filteredManualCronSuppliers = useMemo(() => {
        let combined: any[] = [...ensureArray(suppliers)];
        const ppais = ensureArray(perCapitaConfig?.ppaisProducers || []);
        const pereciveis = ensureArray(perCapitaConfig?.pereciveisSuppliers || []);
        const estocaveis = ensureArray(perCapitaConfig?.estocaveisSuppliers || []);
        
        [...ppais, ...pereciveis, ...estocaveis].forEach((p: any) => {
            if (p && p.name && !combined.some(s => matchCpf(s.cpf || s.cpfCnpj, p.cpfCnpj || p.cpf))) {
                combined.push({
                    name: p.name,
                    cpf: p.cpf || p.cpfCnpj,
                    address: p.address || '',
                    contractItems: p.contractItems || []
                });
            }
        });

        if (!manualCronSupplierSearch) return combined;
        const sLower = manualCronSupplierSearch.toLowerCase();
        return combined.filter((s: any) => 
            (s.name || '').toLowerCase().includes(sLower) || 
            (s.cpf || s.cpfCnpj || '').replace(/\D/g, '').includes(sLower)
        );
    }, [suppliers, perCapitaConfig, manualCronSupplierSearch]);

    useEffect(() => {
        if (cronogramaSubTab !== 'manual') return;
        const cleanedCpf = cleanCpf(manualCronSupplierCpfCnpj);
        if (!cleanedCpf) {
            setManualCronItems([]);
            return;
        }

        const fetchManualCron = async () => {
            setIsLoadingManualCron(true);
            try {
                const db = getDatabase(app);
                const path = `manual_cronogramas/${cleanedCpf}/${manualCronYear}/${manualCronMonth}`;
                const snapshot = await get(ref(db, path));
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    if (data.items) {
                        setManualCronItems(data.items);
                    } else {
                        setManualCronItems([]);
                    }
                    if (data.supplierName) {
                        setManualCronSupplierName(data.supplierName);
                    }
                    if (data.supplierAddress) {
                        setManualCronSupplierAddress(data.supplierAddress);
                    }
                } else {
                    setManualCronItems([]);
                }
            } catch (err) {
                console.error("Error loading manual cronograma:", err);
            } finally {
                setIsLoadingManualCron(false);
            }
        };

        fetchManualCron();
    }, [cronogramaSubTab, manualCronSupplierCpfCnpj, manualCronMonth, manualCronYear]);

    const addManualCronItem = () => {
        setManualCronItems(prev => [
            ...prev,
            {
                id: Math.random().toString(36).substring(2, 9),
                date: '',
                week: 'SEMANA 1',
                item: '',
                kg: 0,
                unitPrice: 0,
                totalValue: 0
            }
        ]);
    };

    const removeManualCronItem = (id: string) => {
        setManualCronItems(prev => prev.filter(item => item.id !== id));
    };

    const updateManualCronItem = (id: string, field: string, value: any) => {
        setManualCronItems(prev => prev.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                
                if (field === 'date' && value) {
                    try {
                        const dateParts = value.split('-');
                        const dObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), 12, 0, 0);
                        if (!isNaN(dObj.getTime())) {
                            const weekNo = getWeekNumber(dObj);
                            updated.week = `SEMANA ${weekNo}`;
                        }
                    } catch (e) {
                        console.error("Error parsing date for week calc:", e);
                    }
                }

                if (field === 'kg' || field === 'unitPrice') {
                    const kg = field === 'kg' ? parseFloat(value) || 0 : parseFloat(item.kg) || 0;
                    const price = field === 'unitPrice' ? parseFloat(value) || 0 : parseFloat(item.unitPrice) || 0;
                    updated.totalValue = Number((kg * price).toFixed(2));
                }

                return updated;
            }
            return item;
        }));
    };

    const handleSaveManualCron = async () => {
        const cleanedCpf = cleanCpf(manualCronSupplierCpfCnpj);
        if (!manualCronSupplierName) {
            alert('Por favor, informe o nome do fornecedor.');
            return;
        }
        if (!cleanedCpf) {
            alert('Por favor, informe o CPF/CNPJ.');
            return;
        }

        setIsSavingManualCron(true);
        try {
            const db = getDatabase(app);
            const path = `manual_cronogramas/${cleanedCpf}/${manualCronYear}/${manualCronMonth}`;
            await set(ref(db, path), {
                supplierName: manualCronSupplierName.toUpperCase().trim(),
                supplierCpfCnpj: cleanedCpf,
                supplierAddress: manualCronSupplierAddress.toUpperCase().trim() || 'NÃO INFORMADO',
                periodMonth: manualCronMonth,
                periodYear: manualCronYear,
                items: manualCronItems,
                updatedAt: new Date().toISOString()
            });
            alert('Cronograma manual salvo com sucesso!');
        } catch (err) {
            console.error("Error saving manual cronograma:", err);
            alert('Erro ao salvar o cronograma manual. Tente novamente.');
        } finally {
            setIsSavingManualCron(false);
        }
    };

    const handlePrintManualCronograma = () => {
        if (!manualCronSupplierName) {
            alert('Por favor, preencha o nome do fornecedor.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const totalWeight = manualCronItems.reduce((sum, item) => sum + (parseFloat(item.kg) || 0), 0);
        const totalValue = manualCronItems.reduce((sum, item) => sum + (parseFloat(item.totalValue) || 0), 0);
        
        const monthIndex = MONTHS_PT.indexOf(manualCronMonth);
        const firstBusinessDay = getFirstBusinessDayOfMonth(monthIndex, manualCronYear);
        const dateStrFirstBusinessDay = `${firstBusinessDay.getDate()} de ${firstBusinessDay.toLocaleDateString('pt-BR', { month: 'long' })} de ${manualCronYear}`;

        const htmlContent = `
            <html>
            <head>
                <title>Cronograma de Entrega (Manual) - ${manualCronMonth} de ${manualCronYear}</title>
                <style>
                    @page { size: A4 portrait; margin: 8mm 12mm 8mm 12mm; }
                    body { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.3; color: #000; margin: 0; padding: 0; }
                    .container { width: 100%; }
                    .header-title { text-align: center; font-weight: bold; font-size: 11pt; text-transform: uppercase; margin-top: 0px; margin-bottom: 10px; letter-spacing: 0.5px; }
                    
                    .paragraph { text-align: justify; margin-bottom: 8px; text-indent: 0px; font-size: 8.5pt; line-height: 1.3; }
                    
                    .section-title-box { border: 1.5px solid #000; text-align: center; font-weight: bold; font-size: 9.5pt; text-transform: uppercase; padding: 3px; margin-top: 10px; margin-bottom: 8px; background-color: #f2f2f2; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; text-transform: uppercase; font-size: 6.5pt; line-height: 1.15; }
                    th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; vertical-align: middle; }
                    th { font-weight: bold; text-transform: uppercase; background-color: #f2f2f2; text-align: center; }
                    
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .font-mono { font-family: monospace; }
                    
                    .footer-location { text-align: right; margin-top: 10px; font-weight: bold; font-size: 8.5pt; }
                    .signature-section { margin-top: 25px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; page-break-inside: avoid; }
                    .signature-line { border-top: 1px solid #000; width: 280px; margin-bottom: 5px; }
                    .signature-name { font-weight: bold; text-transform: uppercase; font-size: 9pt; }
                    .signature-role { font-size: 8pt; color: #444; text-transform: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header-title">CRONOGRAMA DE ENTREGA</div>
                    
                    <div class="paragraph">
                        <strong>Agricultor/fornecedor:</strong> ${manualCronSupplierName.toUpperCase()}, maior, capaz e residente na ${manualCronSupplierAddress.toUpperCase() || 'NÃO INFORMADO'}, inscrito no CPF/CNPJ: ${manualCronSupplierCpfCnpj || 'NÃO INFORMADO'} doravante designado Contratado.
                    </div>
                    
                    <div class="paragraph">
                        Solicitamos as devidas providências de Vossa Senhoria, no sentido de fornecer a esta Unidade Prisional, os itens relacionados abaixo, conforme especificações constantes no Folheto Descrito, durante o período de ${manualCronMonth.toUpperCase()} DE ${manualCronYear}. As entregas deverão ser efetuadas no endereço infra mencionado, impreterivelmente no dia e horário (das 08:00 às 11:00 horas e das 13:00 às 16:00horas) estipulado neste cronograma.
                    </div>
                    
                    <div class="section-title-box">RELAÇÃO DE ITENS A SER ENTREGUE</div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 25%; text-align: center;">DATA DO AGENDAMENTO</th>
                                <th style="width: 35%; text-align: center;">ITEM</th>
                                <th style="width: 15%; text-align: center;">PESO (KG)</th>
                                <th style="width: 15%; text-align: center;">VALOR UNITÁRIO (R$)</th>
                                <th style="width: 15%; text-align: center;">VALOR TOTAL (R$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${manualCronItems.length > 0 ? manualCronItems.map((item: any) => {
                                const kgVal = parseFloat(item.kg) || 0;
                                const unitPriceVal = parseFloat(item.unitPrice) || 0;
                                const totalVal = parseFloat(item.totalValue) || 0;
                                
                                let dateDisplay = item.date;
                                if (item.date && item.date.includes('-')) {
                                    const parts = item.date.split('-');
                                    dateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
                                }
                                if (item.week) {
                                    dateDisplay = `${dateDisplay} (${item.week.toUpperCase()})`;
                                }
                                
                                return `
                                <tr>
                                    <td class="text-center font-mono">${dateDisplay}</td>
                                    <td><strong>${(item.item || '').toUpperCase()}</strong></td>
                                    <td class="text-center font-mono">${kgVal.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                                    <td class="text-center font-mono">R$ ${unitPriceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td class="text-center font-mono">R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                                `;
                            }).join('') : `
                            <tr>
                                <td colspan="5" class="text-center font-bold" style="padding: 20px;">NENHUM ITEM ADICIONADO.</td>
                            </tr>
                            `}
                            <tr class="font-bold uppercase" style="background-color: #f2f2f2;">
                                <td colspan="2" class="text-right">TOTAIS</td>
                                <td class="text-center font-mono">${totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} Kg</td>
                                <td class="text-center">---</td>
                                <td class="text-center font-mono">R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="paragraph" style="font-size: 10pt; line-height: 1.5; text-align: justify;">
                        De acordo com a Cláusula Segunda do contrato no seu item 1º. O objeto da presente contratação será entregue parceladamente, nos prazos e locais determinados pela CONTRATANTE, conforme cronograma de fornecimento Anexo I do presente contrato;
                    </div>
                    
                    <div class="footer-location">
                        Taiuva, ${dateStrFirstBusinessDay}
                    </div>
                    
                    <div class="signature-section">
                        <div class="signature-line"></div>
                        <div class="signature-name">JOSÉ FABIANO MOUTIN</div>
                        <div class="signature-role">Chefe de Seção de Finanças e Suprimentos</div>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    const imageDeliveries = useMemo(() => {
        try {
            const deliveries: any[] = [];
            
            ensureArray(suppliers).forEach(s => {
                if (!s) return;
                const supplierDeliveries = ensureArray(s.deliveries);
                supplierDeliveries.forEach((d: any) => {
                    if (d) {
                        let finalTimestamp = d.timestamp;
                        if (!finalTimestamp && d.date) {
                            const parsedDate = new Date(d.date + 'T12:00:00');
                            finalTimestamp = isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
                        } else if (!finalTimestamp) {
                            finalTimestamp = 0;
                        }

                        deliveries.push({
                            id: d.id || `del-${crypto.randomUUID().substring(0, 8)}`,
                            invoiceUrl: d.invoiceUrl || '',
                            date: d.invoiceDate || d.date,
                            timestamp: finalTimestamp,
                            type: 'entrada',
                            supplierName: s.name || 'Desconhecido',
                            supplierCpf: s.cpf || '',
                            itemName: d.item || 'Item s/ nome',
                            quantity: Number(d.kg || d.quantity) || 0,
                            inboundInvoice: d.invoiceNumber || '',
                            receiptTermNumber: d.receiptTermNumber || '',
                            nl: d.nl || d.nlNumber || '',
                            pd: d.pd || d.pdNumber || '',
                            ne: d.ne || d.neNumber || '',
                            lotNumber: d.lotNumber || '',
                            expirationDate: d.expirationDate || '',
                        });
                    }
                });
            });

            if (perCapitaConfig) {
                const pcLists = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
                pcLists.forEach(listKey => {
                    ensureArray(perCapitaConfig[listKey]).forEach((p: any) => {
                        if (!p) return;
                        ensureArray(p.deliveries).forEach((d: any) => {
                            if (d) {
                                let finalTimestamp = d.timestamp;
                                if (!finalTimestamp && d.date) {
                                    const parsedDate = new Date(d.date + 'T12:00:00');
                                    finalTimestamp = isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
                                }
                                deliveries.push({
                                    id: d.id || `del-pc-${crypto.randomUUID().substring(0, 8)}`,
                                    invoiceUrl: d.invoiceUrl || '',
                                    date: d.invoiceDate || d.date,
                                    timestamp: finalTimestamp || 0,
                                    type: 'entrada',
                                    supplierName: p.name || 'Desconhecido',
                                    supplierCpf: p.cpfCnpj || p.cpf || '',
                                    itemName: d.item || 'Item s/ nome',
                                    quantity: Number(d.kg || d.quantity) || 0,
                                    inboundInvoice: d.invoiceNumber || '',
                                    receiptTermNumber: d.receiptTermNumber || '',
                                    pd: d.pd || d.pdNumber || '',
                                    ne: d.ne || d.neNumber || '',
                                    lotNumber: d.lotNumber || '',
                                    expirationDate: d.expirationDate || '',
                                });
                            }
                        });
                    });
                });
            }

            (warehouseLog || []).forEach(l => {
                if (l) {
                    const anyL = l as any;
                    let finalTimestamp = anyL.timestamp ? new Date(anyL.timestamp).getTime() : 0;
                    if ((!finalTimestamp || isNaN(finalTimestamp)) && anyL.date) {
                        const parsedDate = new Date(anyL.date + 'T12:00:00');
                        finalTimestamp = isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
                    } else if (!finalTimestamp || isNaN(finalTimestamp)) {
                        finalTimestamp = 0;
                    }

                    let foundSupplierName = anyL.supplierName && anyL.supplierName !== 'Desconhecido' ? anyL.supplierName : 'Desconhecido';
                    if (foundSupplierName === 'Desconhecido' && anyL.supplierCpf) {
                        const supplier = suppliers?.find(s => s && matchCpf(s.cpf, anyL.supplierCpf));
                        if (supplier) {
                            foundSupplierName = supplier.name;
                        } else if (perCapitaConfig) {
                            const allPcSuppliers = [
                                ...(perCapitaConfig.ppaisProducers || []),
                                ...(perCapitaConfig.pereciveisSuppliers || []),
                                ...(perCapitaConfig.estocaveisSuppliers || [])
                            ];
                            const pcSupplier = allPcSuppliers.find(s => s && (matchCpf(s.cpf, anyL.supplierCpf) || matchCpf(s.cpfCnpj, anyL.supplierCpf)));
                            if (pcSupplier) {
                                foundSupplierName = pcSupplier.name;
                            }
                        }
                    }

                    deliveries.push({
                        id: anyL.id || `log-${crypto.randomUUID().substring(0, 8)}`,
                        invoiceUrl: anyL.invoiceUrl || '',
                        date: anyL.date,
                        timestamp: finalTimestamp,
                        type: anyL.type || 'entrada',
                        supplierName: foundSupplierName,
                        supplierCpf: anyL.supplierCpf || '',
                        itemName: anyL.itemName || anyL.item || 'Item s/ nome',
                        quantity: Number(anyL.quantity || anyL.kg || anyL.weight) || 0,
                        inboundInvoice: anyL.inboundInvoice || anyL.invoiceNumber || '',
                        receiptTermNumber: anyL.receiptTermNumber || '',
                        nl: anyL.nlNumber || anyL.nl || '',
                        pd: anyL.pdNumber || anyL.pd || '',
                        ne: anyL.neNumber || anyL.ne || '',
                        lotNumber: anyL.lotNumber || '',
                        expirationDate: anyL.expirationDate || '',
                    });
                }
            });

            const cleanStr = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
            
            // Map to store first valid URL and NE for each (supplier, invoice) group
            const urlAndNeMap = new Map<string, { url: string; ne: string; pd: string; receipt: string; date: string }>();
            
            deliveries.forEach(d => {
                const cleanCpf = cleanStr(d.supplierCpf);
                const cleanInv = cleanStr(d.inboundInvoice);
                if (cleanCpf && cleanInv && cleanInv !== 'SN' && cleanInv !== 'PENDENTE') {
                    const key = `${cleanCpf}_${cleanInv}`;
                    const current = urlAndNeMap.get(key);
                    const url = d.invoiceUrl || current?.url || '';
                    const ne = d.ne || current?.ne || '';
                    const pd = d.pd || current?.pd || '';
                    const receipt = d.receiptTermNumber || current?.receipt || '';
                    const date = d.date || current?.date || '';
                    urlAndNeMap.set(key, { url, ne, pd, receipt, date });
                }
            });

            // Group and remove duplication using combined supplier CPF and invoice number
            const finalGroups: Record<string, any> = {};
            deliveries.forEach(d => {
                const cleanCpf = cleanStr(d.supplierCpf);
                const cleanInv = cleanStr(d.inboundInvoice);
                
                // Propagate URL and metadata when applicable
                if (cleanCpf && cleanInv && cleanInv !== 'SN' && cleanInv !== 'PENDENTE') {
                    const key = `${cleanCpf}_${cleanInv}`;
                    const propagated = urlAndNeMap.get(key);
                    if (propagated) {
                        if (!d.invoiceUrl && propagated.url) d.invoiceUrl = propagated.url;
                        if (!d.ne && propagated.ne) d.ne = propagated.ne;
                        if (!d.pd && propagated.pd) d.pd = propagated.pd;
                        if (!d.receiptTermNumber && propagated.receipt) d.receiptTermNumber = propagated.receipt;
                    }
                }

                // We only display entries that contain an invoice visual attachment
                if (!d.invoiceUrl) return;

                const groupKey = `${cleanCpf}_${cleanInv || d.id}`;
                if (!finalGroups[groupKey]) {
                    finalGroups[groupKey] = {
                        ...d,
                        itemNamesList: [d.itemName],
                    };
                } else {
                    const existing = finalGroups[groupKey];
                    if (!existing.invoiceUrl && d.invoiceUrl) existing.invoiceUrl = d.invoiceUrl;
                    if (d.itemName && !existing.itemNamesList.includes(d.itemName)) {
                        existing.itemNamesList.push(d.itemName);
                    }
                    existing.quantity += d.quantity;
                    if (!existing.pd && d.pd) existing.pd = d.pd;
                    if (!existing.ne && d.ne) existing.ne = d.ne;
                    if (!existing.nl && d.nl) existing.nl = d.nl;
                    if (!existing.receiptTermNumber && d.receiptTermNumber) existing.receiptTermNumber = d.receiptTermNumber;
                }
            });

            const uniqueDeliveries = Object.values(finalGroups).map((g: any) => {
                if (g.itemNamesList && g.itemNamesList.length > 0) {
                    g.itemName = Array.from(new Set(g.itemNamesList)).filter(Boolean).join(', ');
                }
                return g;
            });

            return uniqueDeliveries;
        } catch (error) {
            console.error("Critical error in imageDeliveries memo:", error);
            return [];
        }
    }, [suppliers, warehouseLog, perCapitaConfig]);

    const availableImageMonths = useMemo(() => {
        const months = new Set<string>();
        imageDeliveries.forEach(log => {
            const dateStr = log.date || (typeof log.timestamp === 'number' ? new Date(log.timestamp).toISOString().split('T')[0] : (log.timestamp as any)?.split?.('T')?.[0]);
            if (dateStr) {
                const d = new Date(dateStr + 'T00:00:00');
                if (!isNaN(d.getTime())) {
                    months.add(`${d.getFullYear()}-${d.getMonth()}`);
                }
            }
        });

        return Array.from(months).sort((a, b) => {
            const [yA, mA] = a.split('-').map(Number);
            const [yB, mB] = b.split('-').map(Number);
            return (yB * 12 + mB) - (yA * 12 + mA);
        });
    }, [imageDeliveries]);

    const [activeImageMonth, setActiveImageMonth] = useState<string>(() => {
        const months = new Set<string>();
        imageDeliveries.forEach(log => {
            const dateStr = log.date || (typeof log.timestamp === 'number' ? new Date(log.timestamp).toISOString().split('T')[0] : (log.timestamp as any)?.split?.('T')?.[0]);
            if (dateStr) {
                const d = new Date(dateStr + 'T00:00:00');
                if (!isNaN(d.getTime())) {
                    months.add(`${d.getFullYear()}-${d.getMonth()}`);
                }
            }
        });
        const sorted = Array.from(months).sort((a, b) => {
            const [yA, mA] = a.split('-').map(Number);
            const [yB, mB] = b.split('-').map(Number);
            return (yB * 12 + mB) - (yA * 12 + mA);
        });
        return sorted[0] || '';
    });

    useEffect(() => {
        if (!activeImageMonth && availableImageMonths.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveImageMonth(availableImageMonths[0]);
        }
    }, [availableImageMonths, activeImageMonth]);

    const filteredImages = useMemo(() => {
        return imageDeliveries.filter(l => {
            if (!l.invoiceUrl) return false;
            
            // Apply month filter
            let monthMatch = true;
            if (activeImageMonth) {
                const dateStr = l.date || (typeof l.timestamp === 'number' ? new Date(l.timestamp).toISOString().split('T')[0] : (l.timestamp as any)?.split?.('T')?.[0]);
                if (dateStr) {
                    const d = new Date(dateStr + 'T00:00:00');
                    monthMatch = `${d.getFullYear()}-${d.getMonth()}` === activeImageMonth;
                } else {
                    monthMatch = false;
                }
            }

            // Apply search filter (supplierName, itemName, invoiceNumber)
            const searchLower = invoiceSearch.toLowerCase();
            const searchMatch = !invoiceSearch || 
                (l.supplierName || '').toLowerCase().includes(searchLower) ||
                (l.itemName || '').toLowerCase().includes(searchLower) ||
                (l.inboundInvoice || '').toLowerCase().includes(searchLower) ||
                (l.outboundInvoice || '').toLowerCase().includes(searchLower) ||
                (l.invoiceNumber || '').toLowerCase().includes(searchLower);

            return monthMatch && searchMatch;
        }).sort((a, b) => b.timestamp - a.timestamp);
    }, [imageDeliveries, activeImageMonth, invoiceSearch]);

    const handlePrintCronograma = () => {
        const { supplier, monthlyItemsList, totalWeight, totalValue, firstBusinessDay } = cronogramaDetails;
        if (!supplier) {
            alert('Por favor, selecione um fornecedor.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const dateStrFirstBusinessDay = `${firstBusinessDay.getDate()} de ${firstBusinessDay.toLocaleDateString('pt-BR', { month: 'long' })} de ${selectedYear}`;

        const htmlContent = `
            <html>
            <head>
                <title>Cronograma de Entrega - ${selectedMonth} de ${selectedYear}</title>
                <style>
                    @page { size: A4 portrait; margin: 8mm 12mm 8mm 12mm; }
                    body { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.3; color: #000; margin: 0; padding: 0; }
                    .container { width: 100%; }
                    .header-title { text-align: center; font-weight: bold; font-size: 11pt; text-transform: uppercase; margin-top: 0px; margin-bottom: 10px; letter-spacing: 0.5px; }
                    
                    .paragraph { text-align: justify; margin-bottom: 8px; text-indent: 0px; font-size: 8.5pt; line-height: 1.3; }
                    
                    .section-title-box { border: 1.5px solid #000; text-align: center; font-weight: bold; font-size: 9.5pt; text-transform: uppercase; padding: 3px; margin-top: 10px; margin-bottom: 8px; background-color: #f2f2f2; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; text-transform: uppercase; font-size: 6.5pt; line-height: 1.15; }
                    th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; vertical-align: middle; }
                    th { font-weight: bold; text-transform: uppercase; background-color: #f2f2f2; text-align: center; }
                    
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .font-mono { font-family: monospace; }
                    
                    .footer-location { text-align: right; margin-top: 10px; font-weight: bold; font-size: 8.5pt; }
                    .signature-section { margin-top: 25px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; page-break-inside: avoid; }
                    .signature-line { border-top: 1px solid #000; width: 280px; margin-bottom: 5px; }
                    .signature-name { font-weight: bold; text-transform: uppercase; font-size: 9pt; }
                    .signature-role { font-size: 8pt; color: #444; text-transform: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header-title">CRONOGRAMA DE ENTREGA</div>
                    
                    <div class="paragraph">
                        <strong>Agricultor/fornecedor:</strong> ${supplier.name.toUpperCase()}, maior, capaz e residente na ${supplier.address || 'NÃO INFORMADO'}, inscrito no CPF/CNPJ: ${supplier.cpfCnpj || supplier.cpf || 'NÃO INFORMADO'} doravante designado Contratado.
                    </div>
                    
                    <div class="paragraph">
                        Solicitamos as devidas providências de Vossa Senhoria, no sentido de fornecer a esta Unidade Prisional, os itens relacionados abaixo, conforme especificações constantes no Folheto Descrito, durante o período de ${selectedMonth.toUpperCase()} DE ${selectedYear}. As entregas deverão ser efetuadas no endereço infra mencionado, impreterivelmente no dia e horário (das 08:00 às 11:00 horas e das 13:00 às 16:00horas) estipulado neste cronograma.
                    </div>
                    
                    <div class="section-title-box">RELAÇÃO DE ITENS A SER ENTREGUE</div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 25%; text-align: center;">DATA DO AGENDAMENTO</th>
                                <th style="width: 35%; text-align: center;">ITEM</th>
                                <th style="width: 15%; text-align: center;">PESO (KG)</th>
                                <th style="width: 15%; text-align: center;">VALOR UNITÁRIO (R$)</th>
                                <th style="width: 15%; text-align: center;">VALOR TOTAL (R$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${monthlyItemsList.length > 0 ? monthlyItemsList.map((item: any) => `
                            <tr>
                                <td class="text-center font-mono">${item.dateWithWeek || item.date}</td>
                                <td><strong>${item.itemFull || item.item}</strong></td>
                                <td class="text-center font-mono">${item.kg.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                                <td class="text-center font-mono">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td class="text-center font-mono">R$ ${item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            `).join('') : `
                            <tr>
                                <td colspan="5" class="text-center font-bold" style="padding: 20px;">NENHUM ITEM CONSTANTE NA NOTA FISCAL / ENTRADA PARA ESTE PERÍODO E FORNECEDOR.</td>
                            </tr>
                            `}
                            <tr class="font-bold uppercase" style="background-color: #f2f2f2;">
                                <td colspan="2" class="text-right">TOTAIS</td>
                                <td class="text-center font-mono">${totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} Kg</td>
                                <td class="text-center">---</td>
                                <td class="text-center font-mono">R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="paragraph" style="font-size: 10pt; line-height: 1.5; text-align: justify;">
                        De acordo com a Cláusula Segunda do contrato no seu item 1º. O objeto da presente contratação será entregue parceladamente, nos prazos e locais determinados pela CONTRATANTE, conforme cronograma de fornecimento Anexo I do presente contrato;
                    </div>
                    
                    <div class="footer-location">
                        Taiuva, ${dateStrFirstBusinessDay}
                    </div>
                    
                    <div class="signature-section">
                        <div class="signature-line"></div>
                        <div class="signature-name">JOSÉ FABIANO MOUTIN</div>
                        <div class="signature-role">Chefe de Seção de Finanças e Suprimentos</div>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    /*
    const handlePrintScheduleReport = () => {
        const filteredDeliveries = weeklyDeliveries.filter(d => 
            d.type === 'FORNECEDOR' && selectedScheduleSuppliers.includes(d.supplierName)
        );

        if (filteredDeliveries.length === 0) {
            alert('Nenhum agendamento encontrado para os fornecedores selecionados.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita popups para imprimir o cronograma.');
            return;
        }

        const htmlContent = `
            <html>
            <head>
                <title>Cronograma de Entregas</title>
                <style>
                    @page { 
                        size: A4; 
                        margin: 0; 
                    }
                    @media print {
                        header, footer { display: none !important; }
                    }
                    body { 
                        font-family: 'Times New Roman', Times, serif; 
                        padding: 20mm; 
                        line-height: 1.5; 
                        color: #000; 
                        font-size: 12pt; 
                        margin: 0;
                    }
                    .header { text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .info-section { margin-bottom: 20px; }
                    .info-row { margin-bottom: 5px; }
                    .info-label { font-weight: bold; text-transform: uppercase; display: inline-block; width: 220px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt; }
                    th, td { border: 1px solid #000; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; text-transform: uppercase; font-weight: bold; }
                    .text-center { text-align: center; }
                    .footer-text { margin-top: 30px; text-align: justify; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    CRONOGRAMA DE ENTREGAS
                </div>

                <div class="info-section">
                    <div class="info-row"><span class="info-label">PROCESSO SEI Nº:</span> ${scheduleReportSeiNumber || 'N/A'}</div>
                    <div class="info-row"><span class="info-label">DATA DE EMISSÃO:</span> ${new Date().toLocaleDateString('pt-BR')}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>DATA</th>
                            <th>HORÁRIO</th>
                            <th>FORNECEDOR</th>
                            <th>ITEM AGENDADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredDeliveries.map(d => `
                            <tr>
                                <td class="text-center">${d.date.split('-').reverse().join('/')}</td>
                                <td class="text-center">${d.time}</td>
                                <td>${d.supplierName}</td>
                                <td>${d.itemName || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer-text">
                    <p>Cronograma gerado para conferência e acompanhamento das entregas de gêneros alimentícios.</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            // printWindow.close(); // Optional: keep open for review
        }, 500);
    };
    */



    const receiptSupplier = useMemo(() => {
        const main = ensureArray(suppliers).find(s => s && s.cpf === receiptSupplierCpf);
        if (!main) return null;
        
        return {
            ...main,
            deliveries: ensureArray(main.deliveries)
        };
    }, [suppliers, receiptSupplierCpf]);

    const supplierInvoices = useMemo(() => {
        if (!receiptSupplier) return [];
        const invoices = new Set<string>();
        const monthIndex = MONTHS_PT.indexOf(selectedMonth);
        
        const deliveries = (receiptSupplier.deliveries as any) || [];
        deliveries.forEach((d: any) => {
            if (!d || !d.invoiceNumber) return;
            const dateStr = d.invoiceDate || d.date;
            if (dateStr) {
                const deliveryDate = new Date(dateStr + 'T12:00:00');
                if (deliveryDate.getMonth() === monthIndex && deliveryDate.getFullYear() === selectedYear) {
                    invoices.add(d.invoiceNumber);
                }
            }
        });
        return Array.from(invoices).sort();
    }, [receiptSupplier, selectedMonth, selectedYear]);

    const receiptData = useMemo(() => {
        if (!receiptSupplier || !receiptInvoice) return null;
        
        const cleanTargetInvoice = String(receiptInvoice).trim().replace(/^0+/, '');
        
        // Obter itens da nota fiscal diretamente das entregas do fornecedor (Fonte Primária)
        const deliveriesData = receiptSupplier.deliveries || {};
        const deliveriesList = ensureArray(deliveriesData);
        const deliveries = (deliveriesList as any[]).filter(d => {
            if (!d) return false;
            const cleanDInv = String(d.invoiceNumber || '').trim().replace(/^0+/, '');
            return cleanDInv === cleanTargetInvoice;
        });

        // Group items by name to avoid duplicates in the receipt term
        const groupedItemsMap = new Map<string, any>();

        deliveries.forEach(d => {
            if (!d) return;
            const itemName = d.item || 'N/A';
            const quantity = Number(d.kg || d.quantity || 0);
            
            // Tentar buscar o valor registrado no warehouseLog para este item específico
            const itemMovement = (warehouseLog || []).find(log => {
                if (!log) return false;
                const lInbound = String(log.inboundInvoice || '').trim().replace(/^0+/, '');
                const lOutbound = String(log.outboundInvoice || '').trim().replace(/^0+/, '');
                const lInv = String(log.invoiceNumber || '').trim().replace(/^0+/, '');
                
                return (lInbound === cleanTargetInvoice || lOutbound === cleanTargetInvoice || lInv === cleanTargetInvoice) &&
                       (log.item === itemName || log.itemName === itemName) &&
                       (String(log.supplierCpf || '').replace(/\D/g, '') === String(receiptSupplier.cpf || '').replace(/\D/g, ''));
            });

            const contractItemsData = receiptSupplier.contractItems || {};
            const contractItemsList = ensureArray(contractItemsData);
            const contractItem = (contractItemsList as any[]).find((ci: any) => ci && ci.name === itemName);
            const lineTotalValue = Number(itemMovement?.value || d.value || 0);
            const calcUnitPrice = quantity > 0 
                ? (lineTotalValue / quantity) 
                : (Number(contractItem?.valuePerKg) || 0);
            
            let unit = 'Kg';
            if (contractItem?.unit) {
                const [unitType] = contractItem.unit.split('-');
                const unitMap: { [key: string]: string } = {
                    kg: 'Kg', un: 'Un', saco: 'Sc', balde: 'Bd', pacote: 'Pct', pote: 'Pt',
                    litro: 'L', l: 'L', caixa: 'Cx', embalagem: 'Emb', dz: 'Dz'
                };
                unit = unitMap[unitType] || 'Un';
            }

            if (groupedItemsMap.has(itemName)) {
                const existing = groupedItemsMap.get(itemName);
                existing.quantity += quantity;
                existing.totalValue += lineTotalValue;
                existing.unitPrice = existing.quantity > 0 ? (existing.totalValue / existing.quantity) : calcUnitPrice;
                if (!existing.lotNumber && (itemMovement?.lotNumber || d.lotNumber)) {
                    existing.lotNumber = itemMovement?.lotNumber || d.lotNumber;
                }
                const expVal = itemMovement?.expirationDate || d.expirationDate || '';
                if (!existing.expiration && expVal) {
                    existing.expiration = expVal;
                    existing.expirationDate = expVal;
                }
            } else {
                const expVal = itemMovement?.expirationDate || d.expirationDate || '';
                groupedItemsMap.set(itemName, {
                    name: itemName,
                    quantity,
                    unit,
                    unitPrice: calcUnitPrice,
                    totalValue: lineTotalValue,
                    category: contractItem?.category,
                    barcode: itemMovement?.barcode || d.barcode || '',
                    lotNumber: itemMovement?.lotNumber || d.lotNumber || 'UNICO',
                    expiration: expVal,
                    expirationDate: expVal
                });
            }
        });

        // Mirror entries from warehouseLog that might not be in supplier deliveries
        (warehouseLog || []).forEach(log => {
            if (!log) return false;
            if (log.type === 'saída' || log.type === 'saida') return false;

            const lInbound = String(log.inboundInvoice || '').trim().replace(/^0+/, '');
            const lOutbound = String(log.outboundInvoice || '').trim().replace(/^0+/, '');
            const lInv = String(log.invoiceNumber || '').trim().replace(/^0+/, '');
            
            if (!(lInbound === cleanTargetInvoice || lOutbound === cleanTargetInvoice || lInv === cleanTargetInvoice)) return;
            if (String(log.supplierCpf || '').replace(/\D/g, '') !== String(receiptSupplier.cpf || '').replace(/\D/g, '')) return;

            const itemName = log.item || log.itemName || 'N/A';
            if (itemName === 'AGENDAMENTO PENDENTE') return;

            const quantity = Number(log.kg || log.quantity || 0);
            const lineTotalValue = Number(log.value || 0);
            
            if (groupedItemsMap.has(itemName)) {
                const existing = groupedItemsMap.get(itemName);
                
                // Only add quantity if it wasn't already in deliveries, or if it was, we assume deliveries has the full amount.
                // Actually, if it's already in deliveries, deliveries usually represents the whole invoice.
                // However, if the user added it ONLY via warehouseLog, it won't be in deliveries.
                // If the user added MULTIPLE items via warehouseLog, we need to accumulate them.
                // Since we already processed deliveries, if `existing` came from deliveries, should we add this quantity?
                // `AdminInvoices.tsx` pushes new items from warehouseLog ONLY if they don't exist by name/kg/barcode.
                // Here, since we group by name, we can just say: if it's already here, we don't add the quantity, unless we track what we added.
                // Let's just track a flag `fromLogOnly` to know if we can add to it.
                if (existing.fromLogOnly) {
                    existing.quantity += quantity;
                    existing.totalValue += lineTotalValue;
                    existing.unitPrice = existing.quantity > 0 ? (existing.totalValue / existing.quantity) : existing.unitPrice;
                }

                if (!existing.lotNumber && log.lotNumber) existing.lotNumber = log.lotNumber;
                if (!existing.expiration && log.expirationDate) {
                    existing.expiration = log.expirationDate;
                    existing.expirationDate = log.expirationDate;
                }
            } else {
                const contractItemsData = receiptSupplier.contractItems || {};
                const contractItemsList = ensureArray(contractItemsData);
                const contractItem = (contractItemsList as any[]).find((ci: any) => ci && ci.name === itemName);
                const calcUnitPrice = quantity > 0 
                    ? (lineTotalValue / quantity) 
                    : (Number(contractItem?.valuePerKg) || 0);
                
                let unit = 'Kg';
                if (contractItem?.unit) {
                    const [unitType] = contractItem.unit.split('-');
                    const unitMap: { [key: string]: string } = {
                        kg: 'Kg', un: 'Un', saco: 'Sc', balde: 'Bd', pacote: 'Pct', pote: 'Pt',
                        litro: 'L', l: 'L', caixa: 'Cx', embalagem: 'Emb', dz: 'Dz'
                    };
                    unit = unitMap[unitType] || 'Un';
                }

                groupedItemsMap.set(itemName, {
                    name: itemName,
                    quantity,
                    unit,
                    unitPrice: calcUnitPrice,
                    totalValue: lineTotalValue,
                    category: contractItem?.category,
                    barcode: log.barcode || '',
                    lotNumber: log.lotNumber || 'UNICO',
                    expiration: log.expirationDate || '',
                    expirationDate: log.expirationDate || '',
                    fromLogOnly: true
                });
            }
        });

        if (groupedItemsMap.size === 0) return null;

        const items = Array.from(groupedItemsMap.values());

        const totalInvoiceValue = items.reduce((sum, it) => sum + it.totalValue, 0);
        const firstDelivery = deliveries[0] || {};
        
        let logDate = '';
        let logNe = '';
        let logPd = '';
        if (deliveries.length === 0) {
            const firstLog = (warehouseLog || []).find(log => {
                const lInbound = String(log.inboundInvoice || '').trim().replace(/^0+/, '');
                const lOutbound = String(log.outboundInvoice || '').trim().replace(/^0+/, '');
                const lInv = String(log.invoiceNumber || '').trim().replace(/^0+/, '');
                return (lInbound === cleanTargetInvoice || lOutbound === cleanTargetInvoice || lInv === cleanTargetInvoice) && 
                       (String(log.supplierCpf || '').replace(/\D/g, '') === String(receiptSupplier.cpf || '').replace(/\D/g, ''));
            });
            if (firstLog) {
                const anyLog = firstLog as any;
                logDate = firstLog.date || '';
                logNe = firstLog.neNumber || anyLog.ne || '';
                logPd = firstLog.pdNumber || anyLog.pd || '';
            }
        }
        
        const invoiceDate = firstDelivery.invoiceDate || firstDelivery.date || logDate || '';
        const receiptDate = firstDelivery.date || logDate || '';
        const barcode = items.find(it => it.barcode)?.barcode || '';
        const receiptTermNumber = firstDelivery.receiptTermNumber || firstDelivery.neNumber || logNe || logPd || '';

        return {
            supplierName: receiptSupplier.name,
            supplierCpf: receiptSupplier.cpf,
            invoiceNumber: receiptInvoice,
            invoiceDate,
            receiptDate,
            totalInvoiceValue,
            items,
            barcode,
            receiptTermNumber,
            processoSei: receiptProcessoSei
        };
    }, [receiptSupplier, receiptInvoice, receiptProcessoSei, warehouseLog]);

    // Auto-fill SEI Number based on categories
    const handleInvoiceChange = (invoice: string) => {
        setReceiptInvoice(invoice);
        if (receiptSupplier && invoice && perCapitaConfig?.seiProcessNumbers) {
            const deliveries = ensureArray(receiptSupplier.deliveries).filter((d: any) => 
                d.invoiceNumber === invoice && d.item !== 'AGENDAMENTO PENDENTE'
            );
            
            const categories = new Set<string>();
            deliveries.forEach((d: any) => {
                const contractItem = ensureArray(receiptSupplier.contractItems).find((ci: any) => ci.name === d.item);
                if (contractItem?.category) {
                    categories.add(contractItem.category);
                }
            });

            const priorityList = ['ESTOCÁVEIS', 'PPAIS', 'PERECÍVEIS', 'ESTOCAVEIS', 'PERECIVEIS'];
            let autoSei = '';
            for (const cat of priorityList) {
                if (categories.has(cat) && perCapitaConfig.seiProcessNumbers[cat]) {
                    autoSei = perCapitaConfig.seiProcessNumbers[cat];
                    break;
                }
            }

            if (!autoSei) {
                // Tenta fallback baseado na lista de produtores/fornecedores per capita
                const clean = (c: any) => String(c || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
                const match = (a: any, b: any) => {
                    const ca = clean(a);
                    const cb = clean(b);
                    if (!ca || !cb) return false;
                    return ca === cb || (ca.length === 11 && cb.length === 14 && cb.startsWith(ca)) || (cb.length === 11 && ca.length === 14 && ca.startsWith(cb));
                };
                const isPpais = ensureArray(perCapitaConfig.ppaisProducers).some((p: any) => match(p.cpfCnpj || p.cpf, receiptSupplier.cpf));
                const isPereciveis = ensureArray(perCapitaConfig.pereciveisSuppliers).some((p: any) => match(p.cpfCnpj || p.cpf, receiptSupplier.cpf));
                const isEstocaveis = ensureArray(perCapitaConfig.estocaveisSuppliers).some((p: any) => match(p.cpfCnpj || p.cpf, receiptSupplier.cpf));
                
                if (isPpais) autoSei = perCapitaConfig.seiProcessNumbers?.['PPAIS'] || '';
                else if (isPereciveis) autoSei = perCapitaConfig.seiProcessNumbers?.['PERECÍVEIS'] || perCapitaConfig.seiProcessNumbers?.['PERECIVEIS'] || '';
                else if (isEstocaveis) autoSei = perCapitaConfig.seiProcessNumbers?.['ESTOCÁVEIS'] || perCapitaConfig.seiProcessNumbers?.['ESTOCAVEIS'] || '';
            }

            if (!autoSei) {
                for (const cat of Array.from(categories)) {
                    if (perCapitaConfig.seiProcessNumbers[cat]) {
                        autoSei = perCapitaConfig.seiProcessNumbers[cat];
                        break;
                    }
                }
            }
            
            if (autoSei) {
                setReceiptProcessoSei(autoSei);
            }
        }
    };

    const handlePrintAllLabels = () => {
        if (!receiptData) return;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const htmlContent = `
            <html>
            <head>
                <title>Etiquetas - NF ${receiptData.invoiceNumber}</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    @page { size: 100mm 50mm; margin: 0; }
                    body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; background: white; }
                    .label-card {
                        width: 100mm; height: 50mm;
                        padding: 2mm 4mm; box-sizing: border-box;
                        display: flex; flex-direction: column;
                        border: 0.1mm solid #eee;
                        page-break-after: always;
                    }
                    h1 { font-size: 11pt; margin: 0 0 1mm 0; font-weight: 900; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-bottom: 0.3mm solid #000; padding-bottom: 0.5mm; }
                    h2 { font-size: 7.5pt; margin: 0.5mm 0 1.5mm 0; font-weight: bold; text-transform: uppercase; color: #333; }
                    .info { font-size: 7.5pt; line-height: 1.1; flex-grow: 1; }
                    .info p { margin: 0.2mm 0; display: flex; justify-content: space-between; }
                    .info strong { font-weight: 900; text-transform: uppercase; margin-right: 1mm; }
                    .barcode-container { margin-top: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                    .barcode-svg { max-width: 90%; height: 14mm !important; }
                </style>
            </head>
            <body>
                ${receiptData.items.map((item, idx) => `
                    <div class="label-card">
                        <h1>${item.name.split(' ').slice(0, 4).join(' ')}</h1>
                        <h2>${receiptData!.supplierName}</h2>
                        <div class="info">
                            <p><strong>LOTE:</strong> <span>${(receiptData as any).items[idx].lotNumber || 'UNICO'}</span></p>
                            <p><strong>VAL:</strong> <span>${item.expiration ? item.expiration.split('-').reverse().join('/') : 'N/A'}</span></p>
                            <p><strong>QUANT:</strong> <span>${(item.quantity || 0).toFixed(2)} ${item.unit || 'kg'}</span> / <strong>DOC:</strong> <span>${receiptData!.invoiceNumber}</span></p>
                            <p><strong>PROCESSO:</strong> <span>${receiptData!.processoSei || 'N/A'}</span></p>
                        </div>
                        <div class="barcode-container">
                            <svg id="barcode-${idx}" class="barcode-svg"></svg>
                        </div>
                    </div>
                `).join('')}
                <script>
                    window.onload = function() {
                        try {
                            ${receiptData.items.map((item, idx) => `
                                JsBarcode("#barcode-${idx}", "${(receiptData as any).items[idx].barcode || 'N/A'}", {
                                    format: "CODE128", width: 1.2, height: 40, displayValue: true, margin: 0
                                });
                            `).join('')}
                        } catch (e) { console.error(e); }
                        setTimeout(() => { window.print(); window.close(); }, 500);
                    }
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleRegisterTemperature = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tempValue.trim() || isNaN(Number(tempValue))) {
            alert('Por favor, informe uma temperatura válida em graus Celsius (°C).');
            return;
        }
        if (!tempResponsible.trim()) {
            alert('Por favor, informe o responsável pela medição.');
            return;
        }
        if (!onRegisterTemperatureLog) {
            alert('Serviço de registro de temperatura não disponível.');
            return;
        }

        setIsSavingTemp(true);
        try {
            const result = await onRegisterTemperatureLog({
                date: tempDate,
                period: tempPeriod,
                time: tempTime,
                value: Number(tempValue),
                chamber: tempChamber,
                responsible: tempResponsible,
                observations: tempObservations
            });

            if (result.success) {
                setTempValue('');
                setTempObservations('');
                setTempTime(new Date().toTimeString().slice(0, 5));
                alert('Registro de temperatura gravado com sucesso!');
            } else {
                alert(`Erro ao salvar: ${result.message}`);
            }
        } catch (err: any) {
            console.error("Erro ao registrar temperatura:", err);
            alert('Ocorreu um erro ao salvar o registro de temperatura.');
        } finally {
            setIsSavingTemp(false);
        }
    };

    const handleDeleteTemperature = async (id: string) => {
        if (!onDeleteTemperatureLog) return;
        if (confirm('Tem certeza que deseja excluir esta medição?')) {
            try {
                await onDeleteTemperatureLog(id);
                alert('Registro excluído!');
            } catch (err) {
                console.error("Erro ao deletar registro:", err);
                alert('Erro ao excluir o registro.');
            }
        }
    };

    const handlePrintTemperatureReport = () => {
        const filteredLogs = ensureArray(temperatureLogs).filter((log: any) => {
            if (!log) return false;
            const logDate = new Date(log.date + 'T12:00:00');
            const logMonth = MONTHS_PT[logDate.getMonth()];
            const logYear = logDate.getFullYear();
            return logMonth === tempFilterMonth && logYear === tempFilterYear && log.chamber === tempChamber;
        });

        const monthIndex = MONTHS_PT.indexOf(tempFilterMonth);
        const daysInMonth = new Date(tempFilterYear, monthIndex + 1, 0).getDate();

        let tableRowsHtml = '';
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${tempFilterYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const morningLog = filteredLogs.find((l: any) => l.date === dateStr && l.period === 'MANHÃ');
            const afternoonLog = filteredLogs.find((l: any) => l.date === dateStr && l.period === 'TARDE');

            const morningTemp = morningLog ? `${morningLog.value} °C` : '';
            const morningSig = morningLog ? morningLog.responsible.substring(0, 15) : '';
            const morningTimeStr = morningLog ? (morningLog.time || '') : '';

            const afternoonTemp = afternoonLog ? `${afternoonLog.value} °C` : '';
            const afternoonSig = afternoonLog ? afternoonLog.responsible.substring(0, 15) : '';
            const afternoonTimeStr = afternoonLog ? (afternoonLog.time || '') : '';

            const obs = (morningLog?.observations || afternoonLog?.observations || '');

            tableRowsHtml += `
                <tr>
                    <td class="text-center font-bold" style="padding: 4px;">${String(day).padStart(2, '0')}</td>
                    <td class="text-center">${morningTimeStr}</td>
                    <td class="text-center font-bold">${morningTemp}</td>
                    <td class="text-center" style="font-size: 8px;">${morningSig}</td>
                    <td class="text-center">${afternoonTimeStr}</td>
                    <td class="text-center font-bold">${afternoonTemp}</td>
                    <td class="text-center" style="font-size: 8px;">${afternoonSig}</td>
                    <td style="font-size: 8px;">${obs}</td>
                </tr>
            `;
        }

        const isFreezer = tempChamber === 'Câmara Fria de Congelados';
        const rangeRecommended = isFreezer ? 'Mínimo de -18°C' : '0°C a 10°C (Recomendado)';

        const printContent = `
            <html>
                <head>
                    <title>Registro Diário de Temperatura - ${tempChamber}</title>
                    <style>
                        @page { 
                            size: A4 portrait; 
                            margin: 8mm; 
                        }
                        body { 
                            font-family: Arial, sans-serif; 
                            color: #111; 
                            line-height: 1.15; 
                            margin: 0;
                            padding: 0;
                            font-size: 10px;
                        }
                        .header { 
                            text-align: center; 
                            margin-bottom: 8px; 
                            border-bottom: 2px solid #000; 
                            padding-bottom: 4px; 
                        }
                        .header-sap { font-size: 11px; margin-bottom: 1px; text-transform: uppercase; font-weight: bold; }
                        .header-unit { font-size: 13px; font-weight: bold; margin-bottom: 1px; }
                        .header-details { font-size: 8px; color: #444; }
                        .report-title { 
                            text-align: center; 
                            font-size: 12px; 
                            font-weight: bold; 
                            margin: 8px 0; 
                            text-transform: uppercase; 
                            letter-spacing: 0.5px;
                        }
                        .info-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            border: 1px solid #000;
                            margin-bottom: 8px;
                            padding: 5px;
                            font-weight: bold;
                            font-size: 9px;
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin-top: 4px; 
                        }
                        th, td { 
                            border: 1px solid #000; 
                            padding: 3px 4px; 
                            text-align: left; 
                            font-size: 8px; 
                        }
                        th { 
                            background-color: #f2f2f2; 
                            font-weight: bold; 
                            text-align: center;
                            text-transform: uppercase; 
                            font-size: 8px;
                        }
                        .text-center { text-align: center; }
                        .footer { 
                            margin-top: 25px; 
                            display: flex; 
                            justify-content: center; 
                        }
                        .sig { 
                            border-top: 1px solid #000; 
                            width: 220px; 
                            text-align: center; 
                            padding-top: 3px; 
                            font-size: 9px; 
                            font-weight: bold; 
                        }
                        @media print {
                            body { -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="header-sap">Secretaria da Administração Penitenciária</div>
                        <div class="header-unit">Polícia Penal - Penitenciária de Taiúva</div>
                        <div class="header-details">Gestão de Estoque e Almoxarifado - Controle de Higiene e Sanitário</div>
                    </div>
                    
                    <div class="report-title">Folha de Registro Diário de Temperatura</div>

                    <div class="info-grid">
                        <div>CÂMARA: ${tempChamber.toUpperCase()}</div>
                        <div>MÊS/ANO: ${tempFilterMonth} / ${tempFilterYear}</div>
                        <div>FAIXA RECOMENDADA: ${rangeRecommended.toUpperCase()}</div>
                        <div>UNIDADE: PENITENCIÁRIA DE TAIÚVA</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th rowspan="2" style="width: 5%;">DIA</th>
                                <th colspan="3" style="width: 35%;">PERÍODO DA MANHÃ (7h às 11h)</th>
                                <th colspan="3" style="width: 35%;">PERÍODO DA TARDE (13h às 17h)</th>
                                <th rowspan="2" style="width: 25%;">OBSERVAÇÕES / MEDIDAS CORRETIVAS</th>
                            </tr>
                            <tr>
                                <th style="width: 8%;">HORA</th>
                                <th style="width: 12%;">TEMP. (°C)</th>
                                <th style="width: 15%;">VISTO / MATRÍCULA</th>
                                <th style="width: 8%;">HORA</th>
                                <th style="width: 12%;">TEMP. (°C)</th>
                                <th style="width: 15%;">VISTO / MATRÍCULA</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHtml}
                        </tbody>
                    </table>

                    <div class="footer">
                        <div class="sig">
                            VISTO DO RESPONSÁVEL DO SETOR<br/>
                            <span style="font-weight: normal; font-size: 7px;">Assinatura & Carimbo</span>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(printContent);
            win.document.close();
            setTimeout(() => {
                win.print();
            }, 500);
        }
    };

    const handlePrintReceipt = () => {
        if (!receiptData) return;
        
        const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
        const formatDate = (dateStr: string) => (dateStr || '').split('-').reverse().join('/') || 'N/A';

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita popups para imprimir o termo.');
            return;
        }

        const htmlContent = `
            <html>
            <head>
                <title>Termo de Recebimento - NF ${receiptData.invoiceNumber}</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    @page { 
                        size: A4; 
                        margin: 0; 
                    }
                    @media print {
                        header, footer { display: none !important; }
                    }
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 0; 
                        margin: 0;
                        background: white;
                    }
                    .page {
                        width: 210mm;
                        min-height: 297mm;
                        padding: 15mm;
                        margin: 0 auto;
                        box-sizing: border-box;
                        background: white;
                    }
                    .header { 
                        text-align: center; 
                        font-weight: bold; 
                        text-transform: uppercase; 
                        margin-bottom: 25px; 
                        border-bottom: 2px solid #000; 
                        padding-bottom: 15px;
                        font-size: 13pt;
                    }
                    .info-section { margin-bottom: 20px; font-size: 11pt; }
                    .info-row { margin-bottom: 8px; display: flex; align-items: flex-start; }
                    .info-label { font-weight: bold; text-transform: uppercase; width: 200px; flex-shrink: 0; }
                    .info-value { flex: 1; }
                    
                    .barcode-row { margin-top: 15px; display: flex; align-items: center; }
                    .barcode-label { font-weight: bold; text-transform: uppercase; width: 200px; flex-shrink: 0; }
                    .barcode-container { flex: 1; display: flex; flex-direction: column; align-items: center; }
                    .barcode-svg { width: 100%; height: 18mm !important; }
                    .barcode-text { font-size: 8pt; font-family: monospace; margin-top: 2px; }

                    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 9pt; }
                    th, td { border: 1px solid #000; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; text-transform: uppercase; font-weight: bold; text-align: center; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    
                    .footer-text { margin-top: 30px; text-align: justify; font-size: 11pt; line-height: 1.4; }
                    .location-date { margin-top: 40px; text-align: center; font-weight: bold; font-size: 12pt; text-transform: uppercase; }
                    
                    .signature-section { margin-top: 60px; text-align: center; }
                    .signature-title { font-weight: bold; margin-bottom: 50px; text-transform: uppercase; font-size: 11pt; }
                    .signature-line { border-top: 1px solid #000; width: 350px; margin: 0 auto 10px auto; }
                    .signature-name { font-weight: bold; margin: 0; text-transform: uppercase; font-size: 11pt; }
                    .signature-info { margin: 0; font-size: 10pt; text-transform: uppercase; }

                    @media print {
                        body { margin: 0; padding: 0; }
                        .page { margin: 0; border: none; box-shadow: none; padding: 15mm; }
                    }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        ATESTAMOS O RECEBIMENTO DOS MATERIAIS/SERVIÇOS RELACIONADOS, ENTREGA PELA EMPRESA:
                    </div>

                    <div class="info-section">
                        <div class="info-row"><span class="info-label">FORNECEDOR:</span> <span class="info-value">${receiptData.supplierName.toUpperCase()}</span></div>
                        <div class="info-row"><span class="info-label">C.N.P.J.:</span> <span class="info-value">${receiptData.supplierCpf}</span></div>
                        <div class="info-row"><span class="info-label">PROCESSO SEI:</span> <span class="info-value">${receiptData.processoSei || 'N/A'}</span></div>
                        <div class="info-row"><span class="info-label">NOTA FISCAL Nº:</span> <span class="info-value">${receiptData.invoiceNumber}</span></div>
                        <div class="info-row"><span class="info-label">NOTA DE EMPENHO:</span> <span class="info-value">${receiptData.receiptTermNumber || 'N/A'}</span></div>
                        <div class="info-row"><span class="info-label">DATA NOTA FISCAL:</span> <span class="info-value">${formatDate(receiptData.invoiceDate)}</span></div>
                        <div class="info-row"><span class="info-label">DATA RECEBIMENTO:</span> <span class="info-value">${formatDate(receiptData.receiptDate)}</span></div>
                        <div class="info-row"><span class="info-label">VALOR TOTAL NF:</span> <span class="info-value">${formatCurrency(receiptData.totalInvoiceValue)}</span></div>
                        
                        ${receiptData.barcode ? `
                        <div class="barcode-row">
                            <span class="barcode-label">CÓD. BARRAS NF:</span>
                            <div class="barcode-container">
                                <svg id="barcode-receipt" class="barcode-svg"></svg>
                                <div class="barcode-text">${receiptData.barcode}</div>
                            </div>
                        </div>
                        ` : ''}
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px;">ITEM</th>
                                <th style="width: 80px;">QUANT.</th>
                                <th style="width: 60px;">UNID.</th>
                                <th>DESCRIÇÃO</th>
                                <th style="width: 120px;">VR. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${receiptData.items.map((it, idx) => `
                                <tr>
                                    <td class="text-center">${String(idx + 1).padStart(2, '0')}</td>
                                    <td class="text-right">${(it.quantity || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td class="text-center">${it.unit || 'N/A'}</td>
                                    <td>
                                        <div style="font-weight: bold;">${it.name || 'N/A'}</div>
                                        ${(it.lotNumber || it.expirationDate) ? `
                                            <div style="font-size: 8px; color: #555; font-family: monospace; margin-top: 2px;">
                                                ${it.lotNumber ? `LOTE: ${it.lotNumber}` : ''}
                                                ${it.expirationDate ? ` | VAL: ${it.expirationDate.split('-').reverse().join('/')}` : ''}
                                            </div>
                                        ` : ''}
                                    </td>
                                    <td class="text-right">${formatCurrency(it.totalValue)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight: bold; background-color: #f2f2f2;">
                                <td colspan="4" class="text-right">TOTAL GERAL:</td>
                                <td class="text-right">${formatCurrency(receiptData.items.reduce((sum, it) => sum + (it.totalValue || 0), 0))}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="footer-text">
                        Recebemos em ordem e na quantidade devida os materiais/serviços acima discriminados, os quais foram inspecionados pela comissão de recepção materiais, foi considerado de acordo com solicitado, satisfazendo as especificações e demais exigências do empenho conforme determina o inciso II do artigo 140 da lei nº 14.133/21.
                    </div>

                    <div class="location-date">
                        TAIÚVA, ${receiptData.receiptDate ? new Date(receiptData.receiptDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : 'DATA NÃO INFORMADA'}
                    </div>

                    <div class="signature-section">
                        <div class="signature-title">COMISSÃO DE RECEPÇÃO DE MATERIAIS/SERVIÇOS</div>
                        <div class="signature-line"></div>
                        <div class="signature-name">FERNANDO RODRIGUES SOARES</div>
                        <div class="signature-info">CPF: 347.810.448-32</div>
                        <div class="signature-info">PRESIDENTE</div>
                    </div>

                    <script>
                        window.onload = function() {
                            ${receiptData.barcode ? `
                            try {
                                JsBarcode("#barcode-receipt", "${receiptData.barcode}", {
                                    format: "CODE128",
                                    width: 2,
                                    height: 50,
                                    displayValue: false,
                                    margin: 0
                                });
                            } catch (e) { console.error(e); }
                            ` : ''}
                            
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 500);
                        }
                    </script>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handlePrintManualReceipt = () => {
        if (!manualReceipt) return;
        
        const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
        const formatDate = (dateStr: string) => (dateStr || '').split('-').reverse().join('/') || 'N/A';

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita popups para imprimir o termo.');
            return;
        }

        const totalValue = manualReceipt.items.reduce((sum: number, it: any) => sum + Number(it.totalValue || 0), 0);

        const htmlContent = `
            <html>
            <head>
                <title>Termo Manual - NF ${manualReceipt.invoiceNumber}</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    @page { size: A4; margin: 0; }
                    body { font-family: Arial, sans-serif; padding: 0; margin: 0; background: white; }
                    .page { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; box-sizing: border-box; background: white; }
                    .header { text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 15px; font-size: 13pt; }
                    .info-section { margin-bottom: 20px; font-size: 11pt; }
                    .info-row { margin-bottom: 8px; display: flex; align-items: flex-start; }
                    .label { font-weight: bold; width: 180px; text-transform: uppercase; }
                    .value { flex: 1; text-transform: uppercase; }
                    table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 9pt; }
                    th, td { border: 1px solid #000; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; }
                    .footer-text { font-size: 9pt; text-align: justify; line-height: 1.5; margin-bottom: 30px; }
                    .sig-section { text-align: center; margin-top: 50px; font-size: 10pt; }
                    .sig-line { width: 300px; border-top: 1px solid #000; margin: 30px auto 10px; }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header italic">
                        Atestamos o recebimento dos materiais/serviços relacionados, entrega pela empresa:
                    </div>
                    <div class="info-section">
                        <div class="info-row"><span class="label">Fornecedor:</span> <span class="value">${manualReceipt.supplierName || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">C.N.P.J.:</span> <span class="value">${manualReceipt.supplierCpf || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">Processo SEI:</span> <span class="value">${manualReceipt.processoSei || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">Nota Fiscal Nº:</span> <span class="value">${manualReceipt.invoiceNumber || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">Nota de Empenho:</span> <span class="value">${manualReceipt.receiptTermNumber || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">Data Nota Fiscal:</span> <span class="value">${formatDate(manualReceipt.invoiceDate)}</span></div>
                        <div class="info-row"><span class="label">Data Recebimento:</span> <span class="value">${formatDate(manualReceipt.receiptDate)}</span></div>
                        <div class="info-row"><span class="label">Valor Total NF:</span> <span class="value">${formatCurrency(totalValue)}</span></div>
                        <div class="info-row">
                            <span class="label">Cód. Barras NF:</span> 
                            <div class="barcode">
                                ${manualReceipt.barcode ? `<svg id="barcode-manual"></svg>` : 'N/A'}
                            </div>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style="text-align: right">Quant.</th>
                                <th>Unid.</th>
                                <th>Descrição</th>
                                <th style="text-align: right">Vr. Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${manualReceipt.items.map((it: any, idx: number) => `
                                <tr>
                                    <td style="text-align: center">${idx + 1}</td>
                                    <td style="text-align: right">${(Number(it.quantity) || 0).toFixed(2)}</td>
                                    <td style="text-align: center">${it.unit || 'N/A'}</td>
                                    <td>${it.name || 'N/A'}</td>
                                    <td style="text-align: right">${formatCurrency(it.totalValue || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight: bold; background-color: #f2f2f2;">
                                <td colspan="4" style="text-align: right">TOTAL GERAL:</td>
                                <td style="text-align: right">${formatCurrency(totalValue)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="footer-text">
                        Recebemos em ordem e na quantidade devida os materiais/serviços acima discriminados, os quais foram inspecionados pela comissão de recepção materiais, foi considerado de acordo com solicitado, satisfazendo as especificações e demais exigências do empenho conforme determina o inciso II do artigo 140 da lei nº 14.133/21.
                    </div>
                    <div class="sig-section">
                        <p class="font-bold uppercase">TAIÚVA, ${manualReceipt.receiptDate ? new Date(manualReceipt.receiptDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : 'DATA NÃO INFORMADA'}</p>
                        <p style="font-weight: bold; margin-top: 30px;">COMISSÃO DE RECEPÇÃO DE MATERIAIS/SERVIÇOS</p>
                        <div class="sig-line"></div>
                        <p style="font-weight: bold">FERNANDO RODRIGUES SOARES</p>
                        <p>CPF: 347.810.448-32</p>
                        <p>PRESIDENTE</p>
                    </div>
                </div>
                <script>
                    if (document.getElementById('barcode-manual') && "${manualReceipt.barcode}") {
                        JsBarcode("#barcode-manual", "${manualReceipt.barcode}", {
                            format: "CODE128",
                            width: 1.5,
                            height: 35,
                            displayValue: true
                        });
                    }
                    window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const addManualItem = () => {
        setManualReceipt({
            ...manualReceipt,
            items: [...manualReceipt.items, { name: '', quantity: 0, unit: 'UN', totalValue: 0 }]
        });
    };

    const removeManualItem = (index: number) => {
        const newItems = manualReceipt.items.filter((_: any, i: number) => i !== index);
        setManualReceipt({ ...manualReceipt, items: newItems });
    };

    const updateManualItem = (index: number, field: string, value: any) => {
        const newItems = manualReceipt.items.map((it: any, i: number) => {
            if (i === index) return { ...it, [field]: value };
            return it;
        });
        setManualReceipt({ ...manualReceipt, items: newItems });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Módulo de Estoque</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Dados P Taiuva 2026</p>
                </div>
                <div className="flex items-center gap-3">
                    {typeof navigator !== 'undefined' && !navigator.onLine && (
                        <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            Modo Offline
                        </div>
                    )}
                    <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto max-w-[80vw]">
                        {['history', 'movement_history', 'image_history', 'validity', 'agenda', 'cronograma', 'menu', 'receipt', 'manual_receipt', 'directors_percapita', 'camara_fria', 'sync'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)} 
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {tab === 'history' ? 'Consulta & Gestão' : 
                                 tab === 'movement_history' ? 'Log de Movimentação' : 
                                 tab === 'image_history' ? 'Notas Fiscais' : 
                                 tab === 'validity' ? 'Validade' : 
                                 tab === 'agenda' ? 'Agenda' : 
                                 tab === 'cronograma' ? 'Cronograma' : 
                                 tab === 'menu' ? 'Cardápio' : 
                                 tab === 'receipt' ? 'Controle Doc.' : 
                                 tab === 'manual_receipt' ? 'Termo Manual' : 
                                 tab === 'directors_percapita' ? 'Per Capita Diretores' : 
                                 tab === 'camara_fria' ? 'Câmaras Frias' : 'Sincronização'}
                            </button>
                        ))}
                    </div>
                    <button onClick={onLogout} className="bg-slate-100 text-slate-600 font-black py-2 px-6 rounded-xl text-xs uppercase border border-slate-200 shadow-sm hover:bg-slate-200 active:scale-95 transition-all">Sair</button>
                </div>
            </header>

            <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                {activeTab === 'history' ? (
                    <div className="space-y-8">
                        <WarehouseMovementForm 
                            key="warehouse-movement-form"
                            suppliers={suppliers} 
                            warehouseLog={warehouseLog} 
                            onRegisterEntry={onRegisterEntry}
                            onRegisterWithdrawal={onRegisterWithdrawal}
                            initialMode="entrada"
                            perCapitaConfig={perCapitaConfig}
                            acquisitionItems={acquisitionItems}
                        />

                        <div className="border-t border-gray-100 pt-8">
                            <AdminInvoices 
                                suppliers={suppliers} 
                                warehouseLog={warehouseLog}
                                onReopenInvoice={onReopenInvoice} 
                                onDeleteInvoice={onDeleteInvoice} 
                                onUpdateInvoiceItems={onUpdateInvoiceItems} 
                                onUpdateInvoiceUrl={onUpdateInvoiceUrl}
                                onManualInvoiceEntry={onManualInvoiceEntry}
                                onMarkInvoiceAsOpened={onMarkInvoiceAsOpened}
                                mode="warehouse_entry"
                                perCapitaConfig={perCapitaConfig}
                                acquisitionItems={acquisitionItems}
                            />
                        </div>
                    </div>
                ) : activeTab === 'movement_history' ? (
                    <AdminWarehouseLog 
                        warehouseLog={warehouseLog}
                        suppliers={suppliers}
                        onDeleteEntry={onDeleteWarehouseEntry!}
                        onUpdateWarehouseEntry={onUpdateWarehouseEntry!}
                        perCapitaConfig={perCapitaConfig}
                    />
                ) : activeTab === 'image_history' ? (
                    <div className="space-y-6 animate-fade-in">
                        {/* Compact Modern Header */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg">
                                        <FileIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black uppercase tracking-tighter leading-none text-white italic">Notas Fiscais</h2>
                                        <p className="text-zinc-400 font-bold text-[7px] uppercase tracking-widest mt-0.5 opacity-80">Gestão Documental e Visualização</p>
                                    </div>
                                </div>

                                <div className="relative w-full md:w-64 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input 
                                        type="text"
                                        placeholder="BUSCAR FORNECEDOR OU NOTA..."
                                        value={invoiceSearch}
                                        onChange={e => setInvoiceSearch(e.target.value)}
                                        className="w-full h-9 pl-9 pr-4 bg-zinc-800 border-none rounded-xl text-[9px] font-black uppercase tracking-widest text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:italic"
                                    />
                                </div>
                            </div>

                            {/* Dense Month Selector */}
                            {availableImageMonths.length > 0 && (
                                <div className="px-4 py-3 flex gap-2 bg-gray-50 border-b border-gray-100 overflow-x-auto scrollbar-hide">
                                    <button
                                        onClick={() => setActiveImageMonth('')}
                                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                            activeImageMonth === '' 
                                            ? 'bg-zinc-900 text-white shadow-md' 
                                            : 'bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-300'
                                        }`}
                                    >
                                        VER TUDO
                                    </button>
                                    {availableImageMonths.map(monthKey => {
                                        const [year, monthIdx] = monthKey.split('-').map(Number);
                                        const monthName = [
                                            'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
                                            'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
                                        ][monthIdx];
                                        return (
                                            <button
                                                key={monthKey}
                                                onClick={() => setActiveImageMonth(monthKey)}
                                                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                                    activeImageMonth === monthKey 
                                                    ? 'bg-indigo-600 text-white shadow-md' 
                                                    : 'bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-300'
                                                }`}
                                            >
                                                {monthName} / {year}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="p-4 min-h-[400px]">
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                                    {filteredImages.length > 0 ? (
                                        filteredImages.map(log => (
                                            <div key={log.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all group flex flex-col h-full relative">
                                                {/* Smaller Thumbnail - Aspect Document */}
                                                <div 
                                                    className="aspect-[3/4] bg-slate-100 flex items-center justify-center cursor-pointer relative overflow-hidden border-b border-gray-50"
                                                    onClick={() => {
                                                        if (log.invoiceUrl) {
                                                            const win = window.open();
                                                            if (win) {
                                                                win.document.write(`<iframe src="${log.invoiceUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    {log.invoiceUrl?.startsWith('data:image') ? (
                                                        <img src={log.invoiceUrl} alt="NF" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1 text-slate-300 group-hover:text-indigo-400 transition-colors">
                                                            <FileText className="h-5 w-5" />
                                                            <span className="text-[6px] font-black uppercase tracking-widest italic">PDF</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                        <Eye className="text-white h-4 w-4 animate-pulse" />
                                                    </div>
                                                    
                                                    {/* Floating Date Badge */}
                                                    <div className="absolute top-1 right-1 bg-white/90 backdrop-blur-md px-1 py-0.5 rounded shadow-sm border border-white/20">
                                                        <span className="text-[6px] font-mono font-bold text-indigo-950">{(log.date || '').split('-').reverse().join('/')}</span>
                                                    </div>
                                                </div>

                                                <div className="p-2 flex flex-col flex-grow">
                                                    {(() => {
                                                        const hasPd = !!log.pd && log.pd !== '0' && log.pd !== 0 && String(log.pd).trim() !== '';
                                                        return (
                                                            <div className={`text-center py-1.5 px-2 rounded-lg text-[7px] font-black uppercase tracking-wider mb-2 border ${
                                                                hasPd 
                                                                ? 'bg-yellow-400 text-yellow-950 border-yellow-500 shadow-xs' 
                                                                : 'bg-yellow-400 text-yellow-950 border-yellow-500 animate-pulse shadow-sm'
                                                            }`}>
                                                                {hasPd ? `PAGAMENTO CONFIRMADO - PD: ${log.pd}` : 'FALTA PAGAMENTO - PD'}
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="mb-1">
                                                        <div className="flex flex-wrap gap-0.5 mb-1">
                                                            <span className={`text-[5px] font-black ${log.type === 'entrada' ? 'bg-emerald-500' : 'bg-rose-500'} text-white px-1 py-0.5 rounded uppercase tracking-tighter shadow-sm`}>{log.type}</span>
                                                            {log.pd && <span className="text-[5px] font-black bg-indigo-500 text-white px-1 py-0.5 rounded uppercase tracking-tighter shadow-sm">PD {log.pd}</span>}
                                                            {log.ne && <span className="text-[5px] font-black bg-[#ecfdf5] text-[#064e3b] border border-[#047857] px-1 py-0.5 rounded uppercase tracking-tighter shadow-sm">NE {log.ne}</span>}
                                                        </div>
                                                        <h4 className="text-[8px] font-black text-slate-800 uppercase leading-tight mb-0.5 line-clamp-2 h-7 group-hover:text-indigo-600 transition-colors">{log.supplierName}</h4>
                                                    </div>

                                                    <div className="mt-auto">
                                                        <p className="text-[6px] text-slate-400 font-bold uppercase truncate mb-1" title={log.itemName}>{log.itemName}</p>
                                                        
                                                        <div className="pt-1 border-t border-slate-50 grid grid-cols-2 gap-1">
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-400 text-[5px] uppercase font-black tracking-tighter">NF</span>
                                                                <span className="text-slate-900 font-mono text-[7px] font-black truncate">{log.inboundInvoice || log.outboundInvoice || log.invoiceNumber || '-'}</span>
                                                            </div>
                                                            <div className="text-right flex flex-col">
                                                                <span className="text-slate-400 text-[5px] uppercase font-black tracking-tighter block">QTD</span>
                                                                <span className="text-indigo-700 font-black text-[7px] italic">{Number(log.quantity).toFixed(1)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-24 flex flex-col items-center justify-center">
                                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
                                                <Search className="h-10 w-10 text-slate-200" />
                                            </div>
                                            <h3 className="text-slate-300 font-black uppercase tracking-[0.3em] text-xs italic">Nenhuma nota encontrada</h3>
                                            <p className="text-slate-400 text-[8px] font-bold uppercase mt-2">Tente ajustar seus filtros ou busca</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'validity' ? (
                    <ValidityAnalysisPanel warehouseLog={warehouseLog} />
                ) : activeTab === 'manual_receipt' ? (
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in relative">
                        <div className="p-4 md:p-6 border-b border-gray-100 bg-amber-600 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 italic shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/10 text-white">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tighter leading-none">Termo Manual</h2>
                                    <p className="text-amber-100 font-bold text-[8px] uppercase tracking-widest mt-0.5 italic">Preenchimento Manual de Termo de Recebimento</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={handlePrintManualReceipt}
                                    className="bg-white text-amber-600 hover:bg-gray-100 font-black py-2 px-6 rounded-xl transition-all shadow-xl active:scale-95 uppercase tracking-widest text-[9px] flex items-center gap-2"
                                >
                                    <Printer className="h-3 w-3" />
                                    Imprimir Termo
                                </button>
                            </div>
                        </div>

                        <div className="p-4 md:p-8 space-y-8">
                            {/* Form Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-amber-50/50 p-6 rounded-[2.5rem] border border-amber-100">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Fornecedor / Produtor</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.supplierName} 
                                        onChange={e => setManualReceipt({...manualReceipt, supplierName: e.target.value})}
                                        placeholder="NOME DO FORNECEDOR"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">CNPJ / CPF</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.supplierCpf} 
                                        onChange={e => setManualReceipt({...manualReceipt, supplierCpf: e.target.value})}
                                        placeholder="00.000.000/0001-00"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Processo SEI</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.processoSei} 
                                        onChange={e => setManualReceipt({...manualReceipt, processoSei: e.target.value})}
                                        placeholder="Nº DO PROCESSO SEI"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Nota Fiscal Nº</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.invoiceNumber} 
                                        onChange={e => setManualReceipt({...manualReceipt, invoiceNumber: e.target.value})}
                                        placeholder="Nº DA NOTA FISCAL"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Nota de Empenho</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.receiptTermNumber} 
                                        onChange={e => setManualReceipt({...manualReceipt, receiptTermNumber: e.target.value})}
                                        placeholder="Nº DO EMPENHO"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Cód. Barras NF</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.barcode} 
                                        onChange={e => setManualReceipt({...manualReceipt, barcode: e.target.value})}
                                        placeholder="CÓDIGO DE BARRAS"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Data Nota Fiscal</label>
                                    <input 
                                        type="date" 
                                        value={manualReceipt.invoiceDate} 
                                        onChange={e => setManualReceipt({...manualReceipt, invoiceDate: e.target.value})}
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Data Recebimento</label>
                                    <input 
                                        type="date" 
                                        value={manualReceipt.receiptDate} 
                                        onChange={e => setManualReceipt({...manualReceipt, receiptDate: e.target.value})}
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-4">
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Itens da Nota</h3>
                                    <button 
                                        onClick={addManualItem}
                                        className="flex items-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold py-2 px-4 rounded-xl transition-all text-[10px] uppercase"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add Item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {manualReceipt.items.map((it: any, idx: number) => (
                                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-fade-in group">
                                            <div className="md:col-span-1 flex items-center justify-center font-black text-slate-300">
                                                {idx + 1}
                                            </div>
                                            <div className="md:col-span-5 space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Descrição do Item</label>
                                                <input 
                                                    type="text" 
                                                    list="available-items-manual"
                                                    value={it.name} 
                                                    onChange={e => updateManualItem(idx, 'name', e.target.value)}
                                                    className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[10px] uppercase" 
                                                />
                                                <datalist id="available-items-manual">
                                                    {Array.from(new Set([
                                                        ...(receiptSupplier?.contractItems?.map((ci: any) => ci.name) || []),
                                                        ...acquisitionItems.map(ai => ai.name)
                                                    ])).sort().map(name => (
                                                        <option key={name} value={name} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Quantidade</label>
                                                <input 
                                                    type="number" 
                                                    value={it.quantity} 
                                                    onChange={e => updateManualItem(idx, 'quantity', e.target.value)}
                                                    className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[10px]" 
                                                />
                                            </div>
                                            <div className="md:col-span-1 space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unid.</label>
                                                <input 
                                                    type="text" 
                                                    value={it.unit} 
                                                    onChange={e => updateManualItem(idx, 'unit', e.target.value)}
                                                    className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[10px] uppercase" 
                                                />
                                            </div>
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valor Total</label>
                                                <input 
                                                    type="number" 
                                                    value={it.totalValue} 
                                                    onChange={e => updateManualItem(idx, 'totalValue', e.target.value)}
                                                    className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[10px]" 
                                                />
                                            </div>
                                            <div className="md:col-span-1 flex items-end pb-1 justify-center">
                                                <button 
                                                    onClick={() => removeManualItem(idx)}
                                                    disabled={manualReceipt.items.length === 1}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-0"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preview Display */}
                            <div className="border-t border-slate-100 pt-8">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-6 px-4">Pré-visualização do Documento</h3>
                                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-white shadow-inner max-h-[500px] overflow-y-auto custom-scrollbar">
                                    <div className="max-w-3xl mx-auto space-y-8 text-black font-serif">
                                        <div className="text-center font-bold uppercase border-b-2 border-black pb-4">
                                            ATESTAMOS O RECEBIMENTO DOS MATERIAIS/SERVIÇOS RELACIONADOS, ENTREGA PELA EMPRESA:
                                        </div>

                                        <div className="space-y-2 uppercase text-sm">
                                            <p><span className="font-bold inline-block w-48">FORNECEDOR:</span> {manualReceipt.supplierName || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">C.N.P.J.:</span> {manualReceipt.supplierCpf || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">PROCESSO SEI:</span> {manualReceipt.processoSei || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">NOTA FISCAL Nº:</span> {manualReceipt.invoiceNumber || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">NOTA DE EMPENHO:</span> {manualReceipt.receiptTermNumber || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">DATA NOTA FISCAL:</span> {(manualReceipt.invoiceDate || '').split('-').reverse().join('/') || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">DATA RECEBIMENTO:</span> {(manualReceipt.receiptDate || '').split('-').reverse().join('/') || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">VALOR TOTAL NF:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(manualReceipt.items.reduce((sum: number, it: any) => sum + (Number(it.totalValue) || 0), 0))}</p>
                                            <p className="flex items-center gap-2">
                                                <span className="font-bold inline-block w-48">CÓD. BARRAS NF:</span> 
                                                {manualReceipt.barcode ? <Barcode value={manualReceipt.barcode} /> : 'N/A'}
                                            </p>
                                        </div>

                                        <table className="w-full border-collapse border border-black text-[10px]">
                                            <thead>
                                                <tr className="bg-gray-100 uppercase font-bold">
                                                    <th className="border border-black p-1">ITEM</th>
                                                    <th className="border border-black p-1">QUANT.</th>
                                                    <th className="border border-black p-1">UNID.</th>
                                                    <th className="border border-black p-1">DESCRIÇÃO</th>
                                                    <th className="border border-black p-1">VR. TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {manualReceipt.items.map((it: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="border border-black p-1 text-center">{idx + 1}</td>
                                                        <td className="border border-black p-1 text-right">{(Number(it.quantity) || 0).toFixed(2)}</td>
                                                        <td className="border border-black p-1 text-center">{it.unit || 'N/A'}</td>
                                                        <td className="border border-black p-1 uppercase">{it.name || 'N/A'}</td>
                                                        <td className="border border-black p-1 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(it.totalValue) || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="font-bold">
                                                    <td colSpan={4} className="border border-black p-1 text-right">TOTAL GERAL:</td>
                                                    <td className="border border-black p-1 text-right">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(manualReceipt.items.reduce((sum: number, it: any) => sum + (Number(it.totalValue) || 0), 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>

                                        <div className="text-xs text-justify leading-relaxed">
                                            Recebemos em ordem e na quantidade devida os materiais/serviços acima discriminados, os quais foram inspecionados pela comissão de recepção materiais, foi considerado de acordo com solicitado, satisfazendo as especificações e demais exigências do empenho conforme determina o inciso II do artigo 140 da lei nº 14.133/21.
                                        </div>

                                        <div className="text-center font-bold pt-4 uppercase">
                                            TAIÚVA, {manualReceipt.receiptDate ? new Date(manualReceipt.receiptDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : 'DATA NÃO INFORMADA'}
                                        </div>

                                        <div className="text-center space-y-1 pt-8">
                                            <p className="font-bold uppercase">COMISSÃO DE RECEPÇÃO DE MATERIAIS/SERVIÇOS</p>
                                            <div className="w-64 h-px bg-black mx-auto mt-8 mb-2"></div>
                                            <p className="font-bold">FERNANDO RODRIGUES SOARES</p>
                                            <p>CPF: 347.810.448-32</p>
                                            <p>PRESIDENTE</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'directors_percapita' ? (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold font-sans text-slate-900 uppercase tracking-tight">Cota dos Diretores</h3>
                        </div>
                        <DirectorPerCapitaTable 
                          data={directorPerCapita} 
                          onUpdate={onUpdateDirectorPerCapita} 
                          currentUser={currentUser}
                          isReadOnly={false}
                          warehouseLog={warehouseLog}
                          suppliers={suppliers}
                          standardMenu={standardMenu}
                          perCapitaConfig={perCapitaConfig}
                        />
                    </div>
                ) : activeTab === 'sync' ? (
                    <SynchronizationModule onSyncWithFirebase={async (data) => {
                        for (const entry of data) {
                            const res = entry.type === 'entrada' ? await onRegisterEntry(entry) : await onRegisterWithdrawal(entry);
                            if (!res.success) throw new Error(res.message);
                        }
                        return true;
                    }} />
                ) : activeTab === 'agenda' ? (
                    <AgendaChegadas 
                        suppliers={suppliers} 
                        thirdPartyEntries={thirdPartyEntries} 
                        embedded={true} 
                        perCapitaConfig={perCapitaConfig}
                        onDeleteDelivery={onDeleteDelivery}
                        onUpdateDelivery={onUpdateDelivery}
                        onSaveInvoice={onSaveInvoice}
                        onUpdateThirdPartyEntry={onUpdateThirdPartyEntry}
                    />
                ) : activeTab === 'cronograma' ? (
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in mb-8">
                        <div className="p-4 md:p-6 border-b border-gray-100 bg-zinc-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 italic shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/10 text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tighter leading-none">Cronograma de Entrega</h2>
                                    <p className="text-zinc-400 font-bold text-[8px] uppercase tracking-widest mt-0.5 italic">Gestão e Impressão de Calendário</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {cronogramaSubTab === 'manual' ? (
                                    <button 
                                        type="button"
                                        onClick={handlePrintManualCronograma}
                                        disabled={!manualCronSupplierName || manualCronItems.length === 0}
                                        className="bg-white text-zinc-900 hover:bg-gray-100 font-black py-2 px-6 rounded-xl transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-[9px] flex items-center gap-2"
                                    >
                                        <Printer className="h-3 w-3" />
                                        Imprimir Manual
                                    </button>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={handlePrintCronograma}
                                        disabled={!selectedCronogramaSupplier}
                                        className="bg-white text-zinc-900 hover:bg-gray-100 font-black py-2 px-6 rounded-xl transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-[9px] flex items-center gap-2"
                                    >
                                        <Printer className="h-3 w-3" />
                                        Imprimir Automático
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-4 md:p-6 space-y-6">
                            {/* Sub-tab Switcher */}
                            <div className="flex border-b border-gray-100 pb-2 gap-2">
                                <button
                                    onClick={() => setCronogramaSubTab('auto')}
                                    className={`px-5 py-2 font-black uppercase text-[10px] tracking-wider transition-all border-b-2 ${
                                        cronogramaSubTab === 'auto'
                                            ? 'border-zinc-900 text-zinc-900 bg-zinc-50 rounded-t-xl'
                                            : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    Gerar Automático (Entradas/NFs)
                                </button>
                                <button
                                    onClick={() => setCronogramaSubTab('manual')}
                                    className={`px-5 py-2 font-black uppercase text-[10px] tracking-wider transition-all border-b-2 ${
                                        cronogramaSubTab === 'manual'
                                            ? 'border-zinc-900 text-zinc-900 bg-zinc-50 rounded-t-xl'
                                            : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    Cadastro Manual de Cronograma
                                </button>
                            </div>

                            {cronogramaSubTab === 'manual' ? (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Manual Form Header / Supplier Selector */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 relative">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Buscar Fornecedor Existente</label>
                                            <div className="relative">
                                                <input 
                                                    type="text"
                                                    placeholder="Buscar fornecedor..."
                                                    value={manualCronSupplierSearch}
                                                    onChange={e => setManualCronSupplierSearch(e.target.value)}
                                                    className="w-full h-9 pl-8 pr-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-zinc-400 transition-all text-[10px] uppercase placeholder-gray-400"
                                                />
                                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                            </div>
                                            {manualCronSupplierSearch && (
                                                <div className="absolute z-10 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg w-72 text-[10px] font-bold uppercase">
                                                    {filteredManualCronSuppliers.length > 0 ? (
                                                        filteredManualCronSuppliers.map((s: any) => (
                                                            <div 
                                                                key={s.cpf || s.cpfCnpj}
                                                                onClick={() => {
                                                                    setManualCronSupplierName(s.name.toUpperCase());
                                                                    setManualCronSupplierCpfCnpj(s.cpf || s.cpfCnpj || '');
                                                                    setManualCronSupplierAddress(s.address || '');
                                                                    setManualCronSupplierSearch('');
                                                                }}
                                                                className="p-2.5 hover:bg-zinc-100 cursor-pointer border-b border-gray-100 text-zinc-800"
                                                            >
                                                                {s.name.toUpperCase()} ({s.cpf || s.cpfCnpj})
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-2 text-gray-500 italic">Nenhum fornecedor encontrado</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Agricultor/Fornecedor *</label>
                                            <input 
                                                type="text"
                                                value={manualCronSupplierName}
                                                onChange={e => setManualCronSupplierName(e.target.value.toUpperCase())}
                                                placeholder="Nome Completo / Razão Social"
                                                className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-zinc-400 transition-all text-[10px] uppercase"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Inscrito no CPF/CNPJ *</label>
                                            <input 
                                                type="text"
                                                value={manualCronSupplierCpfCnpj}
                                                onChange={e => setManualCronSupplierCpfCnpj(e.target.value)}
                                                placeholder="CPF ou CNPJ"
                                                className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-zinc-400 transition-all text-[10px]"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Residente na (Endereço)</label>
                                            <input 
                                                type="text"
                                                value={manualCronSupplierAddress}
                                                onChange={e => setManualCronSupplierAddress(e.target.value.toUpperCase())}
                                                placeholder="Endereço Completo"
                                                className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-zinc-400 transition-all text-[10px] uppercase"
                                            />
                                        </div>
                                    </div>

                                    {/* Period Selection & Quick Tools */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex flex-wrap gap-3 items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Mês do Cronograma:</span>
                                                <select 
                                                    value={manualCronMonth}
                                                    onChange={e => setManualCronMonth(e.target.value)}
                                                    className="h-8 px-2 border border-gray-200 rounded-lg bg-white font-bold outline-none focus:ring-2 focus:ring-zinc-400 transition-all text-[10px] uppercase"
                                                >
                                                    {MONTHS_PT.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Ano:</span>
                                                <select 
                                                    value={manualCronYear}
                                                    onChange={e => setManualCronYear(Number(e.target.value))}
                                                    className="h-8 px-2 border border-gray-200 rounded-lg bg-white font-bold outline-none focus:ring-2 focus:ring-zinc-400 transition-all text-[10px]"
                                                >
                                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={addManualCronItem}
                                                className="bg-zinc-900 text-white hover:bg-zinc-800 font-bold py-1.5 px-4 rounded-lg text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all animate-none"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Adicionar Item
                                            </button>
                                            
                                            <button
                                                type="button"
                                                onClick={handleSaveManualCron}
                                                disabled={isSavingManualCron}
                                                className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold py-1.5 px-4 rounded-lg text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
                                            >
                                                <Save className="h-3.5 w-3.5" />
                                                {isSavingManualCron ? 'Salvando...' : 'Salvar Cronograma'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-[10px] font-bold uppercase tracking-tight text-zinc-900">
                                                <thead className="bg-zinc-100 text-zinc-600 text-[9px] border-b border-gray-200">
                                                    <tr>
                                                        <th className="p-3 w-[20%]">Data do Agendamento</th>
                                                        <th className="p-3 w-[15%]">Semana</th>
                                                        <th className="p-3 w-[30%]">Item (Procure na percapta)</th>
                                                        <th className="p-3 w-[12%]">Peso (Kg)</th>
                                                        <th className="p-3 w-[12%]">Val. Unitário (R$)</th>
                                                        <th className="p-3 w-[12%]">Val. Total (R$)</th>
                                                        <th className="p-3 text-center w-[5%]">Ação</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {isLoadingManualCron ? (
                                                        <tr>
                                                            <td colSpan={7} className="p-8 text-center text-zinc-400 italic">
                                                                Carregando dados salvos...
                                                            </td>
                                                        </tr>
                                                    ) : manualCronItems.length > 0 ? (
                                                        manualCronItems.map((item, idx) => (
                                                            <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-zinc-50/50">
                                                                <td className="p-2">
                                                                    <input 
                                                                        type="date"
                                                                        value={item.date}
                                                                        onChange={e => updateManualCronItem(item.id, 'date', e.target.value)}
                                                                        className="w-full h-8 px-2 border border-gray-200 rounded-md font-bold text-[10px] outline-none focus:ring-1 focus:ring-zinc-400"
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <input 
                                                                        type="text"
                                                                        value={item.week}
                                                                        onChange={e => updateManualCronItem(item.id, 'week', e.target.value)}
                                                                        placeholder="Semana X"
                                                                        className="w-full h-8 px-2 border border-gray-200 rounded-md font-bold text-[10px] outline-none focus:ring-1 focus:ring-zinc-400"
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <input 
                                                                        type="text"
                                                                        list="available-items-manual-cronograma"
                                                                        value={item.item}
                                                                        onChange={e => updateManualCronItem(item.id, 'item', e.target.value)}
                                                                        placeholder="Nome do Item"
                                                                        className="w-full h-8 px-2 border border-gray-200 rounded-md font-bold text-[10px] outline-none focus:ring-1 focus:ring-zinc-400 uppercase"
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <input 
                                                                        type="number"
                                                                        step="0.001"
                                                                        value={item.kg || ''}
                                                                        onChange={e => updateManualCronItem(item.id, 'kg', e.target.value)}
                                                                        placeholder="0,000"
                                                                        className="w-full h-8 px-2 border border-gray-200 rounded-md font-mono text-[10px] outline-none focus:ring-1 focus:ring-zinc-400"
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <input 
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={item.unitPrice || ''}
                                                                        onChange={e => updateManualCronItem(item.id, 'unitPrice', e.target.value)}
                                                                        placeholder="R$ 0,00"
                                                                        className="w-full h-8 px-2 border border-gray-200 rounded-md font-mono text-[10px] outline-none focus:ring-1 focus:ring-zinc-400"
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <input 
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={item.totalValue || ''}
                                                                        onChange={e => updateManualCronItem(item.id, 'totalValue', e.target.value)}
                                                                        placeholder="R$ 0,00"
                                                                        className="w-full h-8 px-2 border border-gray-200 rounded-md font-mono text-[10px] outline-none focus:ring-1 focus:ring-zinc-400 bg-zinc-50"
                                                                    />
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeManualCronItem(item.id)}
                                                                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                                                                        title="Excluir item"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={7} className="p-8 text-center text-zinc-400 italic">
                                                                Nenhum item adicionado ao cronograma manual. Clique em "Adicionar Item" para iniciar.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Datalist for autocomplete */}
                                    <datalist id="available-items-manual-cronograma">
                                        {Array.from(new Set([
                                            ...acquisitionItems.map(ai => ai.name),
                                            ...suppliers.flatMap(s => (s.contractItems || []).map((ci: any) => ci.name || ci.itemName))
                                        ])).filter(Boolean).sort().map(name => (
                                            <option key={name} value={name} />
                                        ))}
                                    </datalist>

                                    {/* Live Document Preview */}
                                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 md:p-8 shadow-inner space-y-6 max-w-4xl mx-auto text-black font-serif text-[12px] leading-relaxed relative">
                                        <div className="absolute top-3 right-3 bg-emerald-600 text-white font-sans text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow">
                                            Pré-visualização do Documento Manual
                                        </div>
                                        <div className="text-center font-bold text-lg border-b border-gray-200 pb-4 uppercase tracking-wider font-serif text-zinc-900">
                                            Cronograma de Entrega
                                        </div>
                                        
                                        <div className="text-justify indent-0 font-serif space-y-4 text-zinc-900">
                                            <p>
                                                <strong>Agricultor/fornecedor:</strong> <span className="underline">{manualCronSupplierName || 'DESCONHECIDO'}</span>, maior, capaz e residente na <span className="underline">{manualCronSupplierAddress || 'NÃO INFORMADO'}</span>, inscrito no CPF/CNPJ: <span className="underline">{manualCronSupplierCpfCnpj || 'NÃO INFORMADO'}</span>, doravante designado contratado.
                                            </p>
                                            <p>
                                                Solicitamos as devidas providências de Vossa Senhoria, no sentido de fornecer a esta Unidade Prisional, os itens relacionados abaixo, conforme especificações constantes no Folheto Descrito, durante o período de <span className="underline font-bold">{manualCronMonth.toUpperCase()} DE {manualCronYear}</span>. As entregas deverão ser efetuadas no endereço infra mencionado, impreterivelmente no dia e horário (das 08:00 às 11:00 horas e das 13:00 às 16:00horas) estipulado neste cronograma.
                                            </p>
                                        </div>

                                        <div className="border border-black bg-gray-50 text-center font-bold text-[11px] py-1 uppercase font-serif text-zinc-950">
                                            Relação de itens a ser entregue
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse border border-black text-left text-[11px] uppercase font-serif text-zinc-950">
                                                <thead>
                                                    <tr className="bg-gray-100 font-bold border-b border-black text-center">
                                                        <th className="border border-black p-2 w-[25%]">Data do Agendamento</th>
                                                        <th className="border border-black p-2 w-[35%]">Item</th>
                                                        <th className="border border-black p-2 w-[15%]">Peso (Kg)</th>
                                                        <th className="border border-black p-2 w-[15%]">Valor Unitário</th>
                                                        <th className="border border-black p-2 w-[15%]">Valor Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {manualCronItems.length > 0 ? (
                                                        manualCronItems.map((item: any, idx: number) => {
                                                            const kgVal = parseFloat(item.kg) || 0;
                                                            const unitPriceVal = parseFloat(item.unitPrice) || 0;
                                                            const totalVal = parseFloat(item.totalValue) || 0;
                                                            
                                                            let dateDisplay = item.date;
                                                            if (item.date && item.date.includes('-')) {
                                                                const parts = item.date.split('-');
                                                                dateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
                                                            }
                                                            if (item.week) {
                                                                dateDisplay = `${dateDisplay} (${item.week.toUpperCase()})`;
                                                            }

                                                            return (
                                                                <tr key={idx} className="border-b border-black">
                                                                    <td className="border border-black p-2 text-center font-mono">{dateDisplay}</td>
                                                                    <td className="border border-black p-2 font-bold">{(item.item || '').toUpperCase()}</td>
                                                                    <td className="border border-black p-2 text-center font-mono">{kgVal.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                                                                    <td className="border border-black p-2 text-center font-mono">R$ {unitPriceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                    <td className="border border-black p-2 text-center font-mono">R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={5} className="border border-black p-6 text-center font-bold text-gray-500 italic">
                                                                Nenhum item adicionado ao cronograma manual.
                                                            </td>
                                                        </tr>
                                                    )}
                                                    <tr className="bg-gray-100 font-bold border-t border-black">
                                                        <td colSpan={2} className="border border-black p-2 text-right">Totais:</td>
                                                        <td className="border border-black p-2 text-center font-mono">
                                                            {manualCronItems.reduce((sum, item) => sum + (parseFloat(item.kg) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} Kg
                                                        </td>
                                                        <td className="border border-black p-2 text-center">---</td>
                                                        <td className="border border-black p-2 text-center font-mono font-bold">
                                                            R$ {manualCronItems.reduce((sum, item) => sum + (parseFloat(item.totalValue) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        <p className="text-[10px] text-justify text-gray-600 font-serif leading-normal">
                                            De acordo com a Cláusula Segunda do contrato no seu item 1º. O objeto da presente contratação será entregue parceladamente, nos prazos e locais determinados pela CONTRATANTE, conforme cronograma de fornecimento Anexo I do presente contrato.
                                        </p>

                                        <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-gray-100 gap-4">
                                            <div className="text-[11px] font-bold font-serif text-zinc-900">
                                                Taiuva, {getFirstBusinessDayOfMonth(MONTHS_PT.indexOf(manualCronMonth), manualCronYear).getDate()} de {getFirstBusinessDayOfMonth(MONTHS_PT.indexOf(manualCronMonth), manualCronYear).toLocaleDateString('pt-BR', { month: 'long' })} de {manualCronYear}
                                            </div>
                                            <div className="text-center font-serif text-zinc-900">
                                                <div className="w-48 border-t border-black mx-auto mb-1"></div>
                                                <div className="font-bold text-[11px]">JOSÉ FABIANO MOUTIN</div>
                                                <div className="text-[9px] text-gray-500">Chefe de Seção de Finanças e Suprimentos</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Processo</label>
                                            <select 
                                                value={cronogramaType} 
                                                onChange={e => { setCronogramaType(e.target.value as any); setSelectedCronogramaSupplier(''); }}
                                                className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-[10px] uppercase"
                                            >
                                                <option value="PPAIS">PPAIS</option>
                                                <option value="ESTOCÁVEIS">ESTOCÁVEIS</option>
                                                <option value="PERECÍVEIS">PERECÍVEIS</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Buscar Fornecedor</label>
                                            <input 
                                                type="text"
                                                placeholder="Buscar..."
                                                value={cronogramaSupplierSearch}
                                                onChange={e => { setCronogramaSupplierSearch(e.target.value); setSelectedCronogramaSupplier(''); }}
                                                className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-[10px] uppercase placeholder-gray-400"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Fornecedor / Produtor</label>
                                            <select 
                                                value={selectedCronogramaSupplier} 
                                                onChange={e => setSelectedCronogramaSupplier(e.target.value)}
                                                className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-[10px] uppercase"
                                            >
                                                <option value="">-- SELECIONE --</option>
                                                {filteredCronogramaSuppliers.map((s: any) => (
                                                    <option key={s.cpfCnpj || s.cpf} value={s.cpfCnpj || s.cpf}>{s.name.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Mês Ref.</label>
                                            <select 
                                                value={selectedMonth} 
                                                onChange={e => setSelectedMonth(e.target.value)}
                                                className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-[10px] uppercase"
                                            >
                                                {MONTHS_PT.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Ano Ref.</label>
                                            <select 
                                                value={selectedYear} 
                                                onChange={e => setSelectedYear(Number(e.target.value))}
                                                className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-[10px] uppercase"
                                            >
                                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    {selectedCronogramaSupplier ? (
                                        <div className="animate-fade-in space-y-4">
                                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col md:flex-row justify-between gap-4 italic font-bold text-[10px] uppercase">
                                                <div>
                                                    <span className="text-indigo-400 mr-2">Processo SEI:</span>
                                                    <span className="text-zinc-900">{perCapitaConfig?.seiProcessNumbers?.[cronogramaType] || 'Indefinido'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-indigo-400 mr-2">Data do Documento:</span>
                                                    <span className="text-zinc-900">{getFirstBusinessDayOfMonth(MONTHS_PT.indexOf(selectedMonth), selectedYear).toLocaleDateString('pt-BR')} (1º Dia Útil)</span>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {/* Grade de visualização dos agendamentos do mês */}
                                                {Array.from({ length: 4 }, (_, i) => i + 1).map(week => {
                                                    const supplier = (cronogramaType === 'PPAIS' ? (perCapitaConfig?.ppaisProducers || []) : 
                                                                     cronogramaType === 'PERECÍVEIS' ? (perCapitaConfig?.pereciveisSuppliers || []) : 
                                                                     (perCapitaConfig?.estocaveisSuppliers || [])).find((s: any) => (matchCpf(s.cpfCnpj, selectedCronogramaSupplier) || matchCpf(s.cpf, selectedCronogramaSupplier))) || 
                                                                     suppliers.find(s => matchCpf(s.cpf, selectedCronogramaSupplier));
                                                    
                                                    const safeMonthSchedule = supplier?.monthlySchedule?.[selectedMonth] || 
                                                                              supplier?.monthlySchedule?.[selectedMonth.toUpperCase()] || 
                                                                              supplier?.monthlySchedule?.[selectedMonth.toLowerCase()] ||
                                                                              supplier?.monthlySchedule?.[selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1).toLowerCase()] || [];
                                                    const isScheduled = safeMonthSchedule.includes(week);
                                                    
                                                    return (
                                                        <div key={week} className={`p-4 rounded-2xl border-2 transition-all ${isScheduled ? 'bg-white border-indigo-500 shadow-md' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                                                            <div className="flex justify-between items-center mb-3">
                                                                <h4 className="text-[10px] font-black uppercase text-zinc-900 tracking-tighter">Semana {week}</h4>
                                                                {isScheduled ? (
                                                                    <span className="bg-indigo-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase">Agendado</span>
                                                                ) : (
                                                                    <span className="bg-gray-200 text-gray-500 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase">Livre</span>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2 text-[9px] font-bold uppercase italic">
                                                                <p className="text-zinc-500 mb-1">Notas Fiscais:</p>
                                                                {(() => {
                                                                    const deliveries = ensureArray(supplier?.deliveries) as any[];
                                                                    const monthIndex = MONTHS_PT.indexOf(selectedMonth);
                                                                    const invoices = new Set<string>();
                                                                    
                                                                    deliveries.forEach((d: any) => {
                                                                        const deliveryDate = new Date((d.invoiceDate || d.date) + 'T12:00:00');
                                                                        // Simple logic: mapping delivery weeks to 1-4. Real logic is complex, 
                                                                        // for now checking month and year:
                                                                        if (deliveryDate.getMonth() === monthIndex && deliveryDate.getFullYear() === selectedYear) {
                                                                             // Here, to filter by week, would need more complex logic. 
                                                                             // Showing all for the month for now.
                                                                             if (d.invoiceNumber) invoices.add(String(d.invoiceNumber).trim());
                                                                        }
                                                                    });
                                                                    return Array.from(invoices).map(inv => (
                                                                        <span key={inv} className="block text-indigo-900 bg-indigo-100 p-1 rounded my-0.5">NF: {inv}</span>
                                                                    ));
                                                                })()}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Visual preview of the official printed document layout */}
                                            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 md:p-8 shadow-inner space-y-6 max-w-4xl mx-auto text-black font-serif text-[12px] leading-relaxed relative">
                                                <div className="absolute top-3 right-3 bg-zinc-900 text-white font-sans text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow">
                                                    Pré-visualização do Documento
                                                </div>
                                                <div className="text-center font-bold text-lg border-b border-gray-200 pb-4 uppercase tracking-wider font-serif text-zinc-900">
                                                    Cronograma de Entrega
                                                </div>
                                                
                                                <div className="text-justify indent-0 font-serif space-y-4 text-zinc-900">
                                                    <p>
                                                        <strong>Agricultor/fornecedor:</strong> <span className="underline">{cronogramaDetails.supplier?.name?.toUpperCase() || 'DESCONHECIDO'}</span>, maior, capaz e residente na <span className="underline">{cronogramaDetails.supplier?.address || 'NÃO INFORMADO'}</span>, inscrito no CPF/CNPJ: <span className="underline">{cronogramaDetails.supplier?.cpfCnpj || cronogramaDetails.supplier?.cpf || 'NÃO INFORMADO'}</span>, doravante designado contratado.
                                                    </p>
                                                    <p>
                                                        Solicitamos as devidas providências de Vossa Senhoria, no sentido de fornecer a esta Unidade Prisional, os itens relacionados abaixo, conforme especificações constantes no Folheto Descrito, durante o período de <span className="underline font-bold">{selectedMonth.toUpperCase()} DE {selectedYear}</span>. As entregas deverão ser efetuadas no endereço infra mencionado, impreterivelmente no dia e horário (das 08:00 às 11:00 horas e das 13:00 às 16:00horas) estipulado neste cronograma.
                                                    </p>
                                                </div>

                                                <div className="border border-black bg-gray-50 text-center font-bold text-[11px] py-1 uppercase font-serif text-zinc-950">
                                                    Relação de itens a ser entregue
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full border-collapse border border-black text-left text-[11px] uppercase font-serif text-zinc-950">
                                                        <thead>
                                                            <tr className="bg-gray-100 font-bold border-b border-black text-center">
                                                                <th className="border border-black p-2 w-[25%]">Data do Agendamento</th>
                                                                <th className="border border-black p-2 w-[35%]">Item</th>
                                                                <th className="border border-black p-2 w-[15%]">Peso (Kg)</th>
                                                                <th className="border border-black p-2 w-[15%]">Valor Unitário</th>
                                                                <th className="border border-black p-2 w-[15%]">Valor Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {cronogramaDetails.monthlyItemsList.length > 0 ? (
                                                                cronogramaDetails.monthlyItemsList.map((item: any, idx: number) => (
                                                                    <tr key={idx} className="border-b border-black">
                                                                        <td className="border border-black p-2 text-center font-mono">{item.dateWithWeek || item.date}</td>
                                                                        <td className="border border-black p-2 font-bold">{item.itemFull || item.item}</td>
                                                                        <td className="border border-black p-2 text-center font-mono">{item.kg.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                                                                        <td className="border border-black p-2 text-center font-mono">R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                        <td className="border border-black p-2 text-center font-mono">R$ {item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan={5} className="border border-black p-6 text-center font-bold text-gray-500 italic">
                                                                        Nenhum item constante na nota fiscal / entrada para este período e fornecedor.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                            <tr className="bg-gray-100 font-bold border-t border-black">
                                                                <td colSpan={2} className="border border-black p-2 text-right">Totais:</td>
                                                                <td className="border border-black p-2 text-center font-mono">{cronogramaDetails.totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} Kg</td>
                                                                <td className="border border-black p-2 text-center">---</td>
                                                                <td className="border border-black p-2 text-center font-mono font-bold">R$ {cronogramaDetails.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <p className="text-[10px] text-justify text-gray-600 font-serif leading-normal">
                                                    De acordo com a Cláusula Segunda do contrato no seu item 1º. O objeto da presente contratação será entregue parceladamente, nos prazos e locais determinados pela CONTRATANTE, conforme cronograma de fornecimento Anexo I do presente contrato.
                                                </p>

                                                <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-gray-100 gap-4">
                                                    <div className="text-[11px] font-bold font-serif text-zinc-900">
                                                        Taiuva, {cronogramaDetails.firstBusinessDay.getDate()} de {cronogramaDetails.firstBusinessDay.toLocaleDateString('pt-BR', { month: 'long' })} de {selectedYear}
                                                    </div>
                                                    <div className="text-center font-serif text-zinc-900">
                                                        <div className="w-48 border-t border-black mx-auto mb-1"></div>
                                                        <div className="font-bold text-[11px]">JOSÉ FABIANO MOUTIN</div>
                                                        <div className="text-[9px] text-gray-500">Chefe de Seção de Finanças e Suprimentos</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                                            <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px]">Selecione um processo e fornecedor para visualizar o cronograma</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'menu' ? (
                    <AdminStandardMenu 
                        suppliers={suppliers} 
                        template={standardMenu} 
                        dailyMenus={dailyMenus} 
                        onUpdateDailyMenus={onUpdateDailyMenu} 
                        inmateCount={perCapitaConfig?.inmateCount || 0} 
                    />
                ) : activeTab === 'receipt' ? (
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in mb-8">
                        <div className="p-4 md:p-6 border-b border-gray-100 bg-zinc-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 italic shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/10 text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tighter leading-none">Termo de Recebimento</h2>
                                    <p className="text-zinc-400 font-bold text-[8px] uppercase tracking-widest mt-0.5 italic">Consolidação de Documentos de Conferência</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={handlePrintReceipt}
                                    disabled={!receiptData}
                                    className="bg-zinc-800 hover:bg-black text-white font-black py-2 px-6 rounded-xl transition-all shadow-xl active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 uppercase tracking-widest text-[9px] flex items-center gap-2 shadow-inner"
                                >
                                    <Printer className="h-3 w-3" />
                                    Termo
                                </button>
                                <button 
                                    type="button"
                                    onClick={handlePrintAllLabels}
                                    disabled={!receiptData}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-6 rounded-xl transition-all shadow-xl active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 uppercase tracking-widest text-[9px] flex items-center gap-2 shadow-inner"
                                >
                                    <BarcodeIcon className="h-3 w-3" />
                                    Etiquetas
                                </button>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 text-teal-600">Mês Ref.</label>
                                    <select 
                                        value={selectedMonth} 
                                        onChange={e => { setSelectedMonth(e.target.value); setReceiptInvoice(''); }}
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-teal-400 transition-all text-[10px] uppercase"
                                    >
                                        {MONTHS_PT.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 text-teal-600">Ano Ref.</label>
                                    <select 
                                        value={selectedYear} 
                                        onChange={e => { setSelectedYear(Number(e.target.value)); setReceiptInvoice(''); }}
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-teal-400 transition-all text-[10px] uppercase"
                                    >
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 text-teal-600">1. Fornecedor</label>
                                    <select 
                                        value={receiptSupplierCpf} 
                                        onChange={e => { setReceiptSupplierCpf(e.target.value); setReceiptInvoice(''); }} 
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-teal-400 transition-all text-[10px] uppercase cursor-pointer"
                                    >
                                        <option value="">-- SELECIONE --</option>
                                        {suppliers.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(s => <option key={s.cpf} value={s.cpf}>{s.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 text-teal-600">2. Nota Fiscal</label>
                                    <select 
                                        value={receiptInvoice} 
                                        onChange={e => handleInvoiceChange(e.target.value)} 
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-teal-400 transition-all text-[10px] uppercase disabled:opacity-50 cursor-pointer" 
                                        disabled={!receiptSupplierCpf}
                                    >
                                        <option value="">-- SELECIONE --</option>
                                        {supplierInvoices.map(nf => <option key={nf} value={nf}>NF {nf}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="bg-slate-50 border-2 border-dashed border-gray-200 p-4 rounded-2xl space-y-1">
                                <label className="text-[9px] font-black text-teal-600 uppercase tracking-[0.2em] ml-1">3. Processo SEI (Auto-Preenchimento)</label>
                                <input 
                                    type="text" 
                                    value={receiptProcessoSei} 
                                    onChange={e => setReceiptProcessoSei(e.target.value)} 
                                    placeholder="Nº do Processo SEI"
                                    className="w-full h-10 px-4 border border-gray-200 rounded-xl bg-white shadow-inner font-black text-zinc-900 outline-none focus:ring-4 focus:ring-teal-50 transition-all text-xs" 
                                />
                            </div>
                        </div>

                        {receiptData ? (
                            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 bg-white shadow-inner max-h-[500px] overflow-y-auto custom-scrollbar">
                                <div className="max-w-3xl mx-auto space-y-8 text-black font-serif">
                                    <div className="text-center font-bold uppercase border-b-2 border-black pb-4">
                                        ATESTAMOS O RECEBIMENTO DOS MATERIAIS/SERVIÇOS RELACIONADOS, ENTREGA PELA EMPRESA:
                                    </div>

                                    <div className="space-y-2 uppercase text-sm">
                                        <p><span className="font-bold inline-block w-48">FORNECEDOR:</span> {receiptData.supplierName || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">C.N.P.J.:</span> {receiptData.supplierCpf || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">PROCESSO SEI:</span> {receiptData.processoSei || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">NOTA FISCAL Nº:</span> {receiptData.invoiceNumber || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">NOTA DE EMPENHO:</span> {receiptData.receiptTermNumber || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">DATA NOTA FISCAL:</span> {(receiptData.invoiceDate || '').split('-').reverse().join('/') || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">DATA RECEBIMENTO:</span> {(receiptData.receiptDate || '').split('-').reverse().join('/') || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">VALOR TOTAL NF:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receiptData.totalInvoiceValue || 0)}</p>
                                        <p className="flex items-center gap-2">
                                            <span className="font-bold inline-block w-48">CÓD. BARRAS NF:</span> 
                                            {receiptData.barcode ? <Barcode value={receiptData.barcode} /> : 'N/A'}
                                        </p>
                                    </div>

                                    <table className="w-full border-collapse border border-black text-[10px]">
                                        <thead>
                                            <tr className="bg-gray-100 uppercase font-bold">
                                                <th className="border border-black p-1">ITEM</th>
                                                <th className="border border-black p-1">QUANT.</th>
                                                <th className="border border-black p-1">UNID.</th>
                                                <th className="border border-black p-1">DESCRIÇÃO</th>
                                                <th className="border border-black p-1">VR. TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {receiptData.items.map((it, idx) => (
                                                <tr key={idx}>
                                                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                                                    <td className="border border-black p-1 text-right">{(it.quantity || 0).toFixed(2)}</td>
                                                    <td className="border border-black p-1 text-center">{it.unit || 'N/A'}</td>
                                                    <td className="border border-black p-1">
                                                        <div className="font-bold">{it.name || 'N/A'}</div>
                                                        {(it.lotNumber || it.expirationDate) && (
                                                            <div className="text-[8px] text-gray-500 font-mono mt-0.5">
                                                                {it.lotNumber && `LOTE: ${it.lotNumber}`}
                                                                {it.expirationDate && ` | VAL: ${it.expirationDate.split('-').reverse().join('/')}`}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="border border-black p-1 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.totalValue || 0)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="font-bold">
                                                <td colSpan={4} className="border border-black p-1 text-right">TOTAL GERAL:</td>
                                                <td className="border border-black p-1 text-right">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receiptData.items.reduce((sum, it) => sum + (it.totalValue || 0), 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>

                                    <div className="text-xs text-justify leading-relaxed">
                                        Recebemos em ordem e na quantidade devida os materiais/serviços acima discriminados, os quais foram inspecionados pela comissão de recepção materiais, foi considerado de acordo com solicitado, satisfazendo as especificações e demais exigências do empenho conforme determina o inciso II do artigo 140 da lei nº 14.133/21.
                                    </div>

                                    <div className="text-center font-bold pt-4">
                                        TAIÚVA, {receiptData.receiptDate ? new Date(receiptData.receiptDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : 'DATA NÃO INFORMADA'}
                                    </div>

                                    <div className="text-center space-y-1 pt-8">
                                        <p className="font-bold uppercase">COMISSÃO DE RECEPÇÃO DE MATERIAIS/SERVIÇOS</p>
                                        <div className="w-64 h-px bg-black mx-auto mt-8 mb-2"></div>
                                        <p className="font-bold">FERNANDO RODRIGUES SOARES</p>
                                        <p>CPF: 347.810.448-32</p>
                                        <p>PRESIDENTE</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-200 m-8 mt-0">
                                <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs">Selecione um fornecedor e uma NF para visualizar o termo de recebimento</p>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'camara_fria' ? (
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in mb-8">
                        {/* Sub Tab Buttons */}
                        <div className="p-4 md:p-6 border-b border-gray-100 bg-zinc-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 italic shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/10 text-white">
                                    <Database className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tighter leading-none">Controle de Câmaras Frias & Ferramentas</h2>
                                    <p className="text-zinc-400 font-bold text-[8px] uppercase tracking-widest mt-0.5 italic">Temperatura, Higienização e Ferramental do Almoxarifado</p>
                                </div>
                            </div>
                            <div className="flex bg-zinc-800 p-1 rounded-2xl border border-zinc-700 overflow-x-auto max-w-full scrollbar-none whitespace-nowrap">
                                <button 
                                    type="button"
                                    onClick={() => setCamaraFriaSubTab('temperature')}
                                    className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${camaraFriaSubTab === 'temperature' ? 'bg-white text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    Controle de Temperatura
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setCamaraFriaSubTab('cleaning')}
                                    className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${camaraFriaSubTab === 'cleaning' ? 'bg-white text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    Controle de Limpeza
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setCamaraFriaSubTab('tools')}
                                    className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${camaraFriaSubTab === 'tools' ? 'bg-white text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    Controle de Ferramentas
                                </button>
                            </div>
                        </div>

                        {camaraFriaSubTab === 'cleaning' ? (
                            <div className="p-4 md:p-6">
                                <AdminCleaningLog 
                                    logs={cleaningLogs} 
                                    financialRecords={financialRecords} 
                                    onRegister={onRegisterCleaningLog || (async () => ({ success: false, message: 'N/A' }))} 
                                    onDelete={onDeleteCleaningLog || (async () => {})} 
                                />
                            </div>
                        ) : camaraFriaSubTab === 'tools' ? (
                            <div className="p-4 md:p-6 space-y-6">
                                {/* Tools Dashboard Container */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-3xl">
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                            <Wrench className="h-5 w-5 text-indigo-500" />
                                            Controle Geral de Ferramentas
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Cadastre, gerencie e controle a retirada e devolução de ferramentas do almoxarifado</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingToolId(null);
                                                setNewTool({
                                                    name: '',
                                                    model: '',
                                                    registerNumber: '',
                                                    toolCode: '',
                                                    category: 'MANUAL',
                                                    location: '',
                                                    status: 'DISPONÍVEL'
                                                });
                                                setIsToolModalOpen(true);
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-4 rounded-xl uppercase tracking-wider text-[9px] transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Nova Ferramenta
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePrintToolsReport}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-4 rounded-xl uppercase tracking-wider text-[9px] transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                            Imprimir Movimentações
                                        </button>
                                    </div>
                                </div>

                                {/* Tools Secondary Tabs */}
                                <div className="flex border-b border-slate-100 gap-6">
                                    <button
                                        type="button"
                                        onClick={() => setToolsView('inventory')}
                                        className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${toolsView === 'inventory' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Estoque de Ferramentas ({tools.length})
                                        {toolsView === 'inventory' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setToolsView('movement')}
                                        className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${toolsView === 'movement' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Retirada / Devolução
                                        {toolsView === 'movement' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setToolsView('logs')}
                                        className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${toolsView === 'logs' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Histórico de Movimentações ({toolMovements.length})
                                        {toolsView === 'logs' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />}
                                    </button>
                                </div>

                                {/* Views Rendering */}
                                {toolsView === 'inventory' && (
                                    <div className="space-y-4">
                                        {/* Search and Filters */}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={toolSearch}
                                                    onChange={e => setToolSearch(e.target.value)}
                                                    placeholder="Buscar por nome, cadastro, código..."
                                                    className="w-full h-9 pl-9 pr-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                />
                                            </div>
                                            <select
                                                value={toolStatusFilter}
                                                onChange={e => setToolStatusFilter(e.target.value)}
                                                className="h-9 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                            >
                                                <option value="TODOS">Todos os Status</option>
                                                <option value="DISPONÍVEL">Disponível</option>
                                                <option value="EMPRESTADO">Emprestado</option>
                                                <option value="MANUTENÇÃO">Manutenção</option>
                                                <option value="DANIFICADO">Danificado</option>
                                            </select>
                                        </div>

                                        {/* Tools Grid */}
                                        {loadingTools ? (
                                            <div className="text-center py-8 text-slate-400 font-bold text-xs uppercase">Carregando ferramentas...</div>
                                        ) : tools.length === 0 ? (
                                            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                                                <Wrench className="h-10 w-10 mx-auto mb-2 opacity-35" />
                                                <p className="font-bold text-xs uppercase">Nenhuma ferramenta cadastrada</p>
                                                <p className="text-[10px] mt-1">Clique em "Nova Ferramenta" para registrar seu primeiro ativo.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {tools
                                                    .filter(t => {
                                                        const matchSearch = t.name?.toLowerCase().includes(toolSearch.toLowerCase()) ||
                                                            t.registerNumber?.toLowerCase().includes(toolSearch.toLowerCase()) ||
                                                            t.toolCode?.toLowerCase().includes(toolSearch.toLowerCase());
                                                        const matchStatus = toolStatusFilter === 'TODOS' || t.status === toolStatusFilter;
                                                        return matchSearch && matchStatus;
                                                    })
                                                    .map(t => {
                                                        const statusColors: Record<string, string> = {
                                                            'DISPONÍVEL': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                                            'EMPRESTADO': 'bg-amber-50 text-amber-700 border-amber-200',
                                                            'MANUTENÇÃO': 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                                            'DANIFICADO': 'bg-rose-50 text-rose-700 border-rose-200',
                                                            'DEFAULT': 'bg-slate-50 text-slate-700 border-slate-200'
                                                        };
                                                        const colorClass = statusColors[t.status] || statusColors['DEFAULT'];

                                                        return (
                                                            <div key={t.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all">
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between items-start">
                                                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{t.category}</span>
                                                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${colorClass}`}>{t.status}</span>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xs font-black text-slate-800 uppercase leading-snug">{t.name}</h4>
                                                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">Mod: {t.model}</p>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2 text-[9px] bg-slate-50 p-2 rounded-xl border border-slate-100 font-bold uppercase text-slate-500">
                                                                        <div>
                                                                            <span className="text-[8px] text-slate-400 block font-normal">CADASTRO</span>
                                                                            {t.registerNumber}
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[8px] text-slate-400 block font-normal">CÓDIGO</span>
                                                                            {t.toolCode}
                                                                        </div>
                                                                        <div className="col-span-2 border-t border-slate-100 pt-1 mt-1">
                                                                            <span className="text-[8px] text-slate-400 block font-normal">ARMAZENAMENTO</span>
                                                                            {t.location}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Código de Barras</span>
                                                                        <div className="font-mono text-[9px] font-bold bg-white px-3 py-1 rounded border border-slate-100 text-slate-800 tracking-widest">{t.barcode}</div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handlePrintToolLabel(t)}
                                                                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-black py-1.5 px-3 rounded-lg uppercase tracking-wider text-[8px] transition-all flex items-center justify-center gap-1"
                                                                        title="Imprimir Etiqueta"
                                                                    >
                                                                        <Printer className="h-3 w-3" />
                                                                        Etiqueta
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setNewTool({
                                                                                name: t.name || '',
                                                                                model: t.model || '',
                                                                                registerNumber: t.registerNumber || '',
                                                                                toolCode: t.toolCode || '',
                                                                                category: t.category || 'MANUAL',
                                                                                location: t.location || '',
                                                                                status: t.status || 'DISPONÍVEL'
                                                                            });
                                                                            setEditingToolId(t.id);
                                                                            setIsToolModalOpen(true);
                                                                        }}
                                                                        className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 border border-slate-200 font-black p-1.5 rounded-lg transition-all"
                                                                        title="Editar"
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteTool(t.id)}
                                                                        className="bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 font-black p-1.5 rounded-lg transition-all"
                                                                        title="Excluir"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {toolsView === 'movement' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Register Form */}
                                        <div className="lg:col-span-1 bg-slate-50 border border-slate-100 p-5 rounded-3xl space-y-4 shadow-sm">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                                <ArrowRightLeft className="h-4 w-4 text-indigo-500" />
                                                Registrar Movimentação
                                            </h4>

                                            <form onSubmit={handleRegisterToolMovement} className="space-y-4">
                                                {/* Barcode/QR Code Scanner Input Area */}
                                                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3.5 space-y-2">
                                                    <label className="text-[10px] font-black text-indigo-950 uppercase flex items-center gap-1">
                                                        <BarcodeIcon className="h-4 w-4 text-indigo-600 animate-pulse" />
                                                        Leitura de Código de Barras (Rápido)
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <input
                                                                type="text"
                                                                value={toolBarcodeQuery}
                                                                onChange={e => setToolBarcodeQuery(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        handleScanBarcode(toolBarcodeQuery);
                                                                        setToolBarcodeQuery('');
                                                                    }
                                                                }}
                                                                placeholder="Bipe o código ou digite..."
                                                                className="w-full h-9 pl-3 pr-8 border border-indigo-200 rounded-xl bg-white shadow-xs font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs text-indigo-950 animate-pulse"
                                                            />
                                                            {toolBarcodeQuery && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setToolBarcodeQuery('')}
                                                                    className="absolute right-2 top-2 text-indigo-400 hover:text-indigo-600"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (toolBarcodeQuery) {
                                                                    handleScanBarcode(toolBarcodeQuery);
                                                                    setToolBarcodeQuery('');
                                                                }
                                                            }}
                                                            className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition-all"
                                                        >
                                                            Buscar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsToolScannerActive(!isToolScannerActive);
                                                                setToolScanFeedback(null);
                                                            }}
                                                            className={`p-2 rounded-xl border transition-all ${isToolScannerActive ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                                            title="Usar câmera para escanear"
                                                        >
                                                            <QrCode className="h-5 w-5" />
                                                        </button>
                                                    </div>

                                                    {/* Camera Scanner Component inside the form */}
                                                    {isToolScannerActive && (
                                                        <div className="border border-indigo-200 rounded-xl overflow-hidden bg-black relative mt-2">
                                                            <div id="tool-qr-reader" className="w-full aspect-square max-h-[220px]"></div>
                                                            <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-[8px] font-bold text-center py-1 rounded">
                                                                Aponte a câmera para o QR Code ou Código de Barras da ferramenta
                                                            </div>
                                                        </div>
                                                    )}

                                                    {toolScanFeedback && (
                                                        <div className={`p-2.5 rounded-xl text-[9px] font-bold leading-relaxed border ${
                                                            toolScanFeedback.type === 'success' 
                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                                                                : toolScanFeedback.type === 'error'
                                                                    ? 'bg-rose-50 text-rose-800 border-rose-100'
                                                                    : 'bg-indigo-50 text-indigo-800 border-indigo-100'
                                                        }`}>
                                                            {toolScanFeedback.message}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo de Operação</label>
                                                    <div className="grid grid-cols-2 gap-2 bg-slate-200/60 p-1 rounded-xl border border-slate-200">
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewMovement(prev => ({ ...prev, type: 'RETIRADA', toolId: '' }))}
                                                            className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${newMovement.type === 'RETIRADA' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                                        >
                                                            SAÍDA (RETIRADA)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewMovement(prev => ({ ...prev, type: 'DEVOLUÇÃO', toolId: '' }))}
                                                            className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${newMovement.type === 'DEVOLUÇÃO' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                                        >
                                                            ENTRADA (DEVOLUÇÃO)
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Ferramenta</label>
                                                    <select
                                                        value={newMovement.toolId}
                                                        onChange={e => setNewMovement(prev => ({ ...prev, toolId: e.target.value }))}
                                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs cursor-pointer"
                                                    >
                                                        <option value="">Selecione uma Ferramenta...</option>
                                                        {tools
                                                            .filter(t => newMovement.type === 'RETIRADA' ? t.status === 'DISPONÍVEL' : t.status === 'EMPRESTADO')
                                                            .map(t => (
                                                                <option key={t.id} value={t.id}>
                                                                    {t.name} (CAD: {t.registerNumber} | CÓD: {t.toolCode})
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Colaborador / Retirante</label>
                                                    <input
                                                        type="text"
                                                        id="tool-movement-person-name"
                                                        value={newMovement.personName}
                                                        onChange={e => setNewMovement(prev => ({ ...prev, personName: e.target.value }))}
                                                        placeholder="Nome de quem está retirando/devolvendo"
                                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Matrícula / CPF</label>
                                                        <input
                                                            type="text"
                                                            value={newMovement.personCpf}
                                                            onChange={e => setNewMovement(prev => ({ ...prev, personCpf: e.target.value }))}
                                                            placeholder="CPF/RE"
                                                            className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Responsável Autorizador</label>
                                                        <input
                                                            type="text"
                                                            value={newMovement.responsible}
                                                            onChange={e => setNewMovement(prev => ({ ...prev, responsible: e.target.value }))}
                                                            className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-100 font-bold outline-none text-slate-500 text-xs"
                                                            readOnly
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Data</label>
                                                        <input
                                                            type="date"
                                                            value={newMovement.date}
                                                            onChange={e => setNewMovement(prev => ({ ...prev, date: e.target.value }))}
                                                            className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Hora</label>
                                                        <input
                                                            type="time"
                                                            value={newMovement.time}
                                                            onChange={e => setNewMovement(prev => ({ ...prev, time: e.target.value }))}
                                                            className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                {newMovement.type === 'RETIRADA' ? (
                                                    <div className="space-y-1 animate-fade-in">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Previsão de Devolução</label>
                                                        <input
                                                            type="date"
                                                            value={newMovement.expectedReturnDate}
                                                            onChange={e => setNewMovement(prev => ({ ...prev, expectedReturnDate: e.target.value }))}
                                                            className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1 animate-fade-in">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Condição de Retorno</label>
                                                        <select
                                                            value={newMovement.condition}
                                                            onChange={e => setNewMovement(prev => ({ ...prev, condition: e.target.value }))}
                                                            className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs cursor-pointer"
                                                        >
                                                            <option value="EXCELENTE">Excelente Estado</option>
                                                            <option value="BOM">Bom Estado (Comum)</option>
                                                            <option value="REGULAR">Regular (Apresenta Desgaste)</option>
                                                            <option value="DANIFICADO">Danificado / Quebrado</option>
                                                            <option value="NECESSITA MANUTENÇÃO">Necessita Manutenção Técnica</option>
                                                        </select>
                                                    </div>
                                                )}

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Observações Adicionais</label>
                                                    <textarea
                                                        value={newMovement.observations}
                                                        onChange={e => setNewMovement(prev => ({ ...prev, observations: e.target.value }))}
                                                        placeholder="Detalhes sobre a retirada, destinação ou anomalias..."
                                                        className="w-full p-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs h-20 resize-none"
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    className={`w-full text-white font-black py-3 rounded-xl uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 shadow-sm ${newMovement.type === 'RETIRADA' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                                >
                                                    <Save className="h-4 w-4" />
                                                    Gravar Movimentação
                                                </button>
                                            </form>
                                        </div>

                                        {/* Simple Guide / Quick Stats */}
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl">
                                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">Informações de Segurança</h4>
                                                <div className="space-y-2 text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                                                    <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-100">
                                                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                        <span><strong>Responsabilidade do Ativo:</strong> Ao retirar uma ferramenta, o colaborador assina digitalmente a responsabilidade pela guarda, conservação e retorno do item no prazo estipulado.</span>
                                                    </div>
                                                    <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-100">
                                                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                                        <span><strong>Inspeção Visual Obrigatória:</strong> Antes de disponibilizar ou receber de volta, verifique trincas, cabos soltos ou fiação elétrica exposta para evitar acidentes de trabalho.</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Fast stats list */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-emerald-800">
                                                    <span className="text-[9px] font-black block uppercase tracking-wider opacity-75">Disponíveis</span>
                                                    <span className="text-2xl font-black">{tools.filter(t => t.status === 'DISPONÍVEL').length}</span>
                                                    <span className="text-[8px] block font-bold mt-1 uppercase opacity-60">Prontas para uso</span>
                                                </div>
                                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-amber-800">
                                                    <span className="text-[9px] font-black block uppercase tracking-wider opacity-75">Em Empréstimo</span>
                                                    <span className="text-2xl font-black">{tools.filter(t => t.status === 'EMPRESTADO').length}</span>
                                                    <span className="text-[8px] block font-bold mt-1 uppercase opacity-60">Em posse de colaboradores</span>
                                                </div>
                                                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-800">
                                                    <span className="text-[9px] font-black block uppercase tracking-wider opacity-75">Fora de Serviço</span>
                                                    <span className="text-2xl font-black">{tools.filter(t => t.status === 'MANUTENÇÃO' || t.status === 'DANIFICADO').length}</span>
                                                    <span className="text-[8px] block font-bold mt-1 uppercase opacity-60">Manutenção / Danificadas</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {toolsView === 'logs' && (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={toolMovementSearch}
                                                onChange={e => setToolMovementSearch(e.target.value)}
                                                placeholder="Filtrar por nome de colaborador, ferramenta, registro de cadastro..."
                                                className="w-full h-9 pl-9 pr-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                            />
                                        </div>

                                        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-100 font-black uppercase text-slate-400 text-[9px] tracking-wider">
                                                            <th className="p-4 text-center">Data / Hora</th>
                                                            <th className="p-4">Ferramenta</th>
                                                            <th className="p-4 text-center">Operação</th>
                                                            <th className="p-4">Colaborador</th>
                                                            <th className="p-4">Autorizado por</th>
                                                            <th className="p-4 text-center">Status</th>
                                                            <th className="p-4">Previsão / Condição</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 font-bold uppercase text-slate-600 text-[10px]">
                                                        {toolMovements.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={7} className="p-8 text-center text-slate-400">Nenhum registro de movimentação encontrado.</td>
                                                            </tr>
                                                        ) : (
                                                            toolMovements
                                                                .filter(log => {
                                                                    return log.toolName?.toLowerCase().includes(toolMovementSearch.toLowerCase()) ||
                                                                        log.personName?.toLowerCase().includes(toolMovementSearch.toLowerCase()) ||
                                                                        log.registerNumber?.toLowerCase().includes(toolMovementSearch.toLowerCase()) ||
                                                                        log.toolCode?.toLowerCase().includes(toolMovementSearch.toLowerCase());
                                                                })
                                                                .map(log => {
                                                                    const isNotReturned = log.type === 'RETIRADA' && !toolMovements.some(m => m.toolId === log.toolId && m.type === 'DEVOLUÇÃO' && m.timestamp > log.timestamp);
                                                                    
                                                                    return (
                                                                    <tr key={log.id} className="hover:bg-slate-50/50">
                                                                        <td className="p-4 text-center text-slate-400">
                                                                            {log.date ? new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                                                                            <span className="block text-[8px] font-normal text-slate-400 mt-0.5">{log.time || ''}</span>
                                                                        </td>
                                                                        <td className="p-4">
                                                                            <span className="text-slate-800 block font-black leading-tight">{log.toolName}</span>
                                                                            <span className="text-[8px] font-semibold text-slate-400">CAD: {log.registerNumber} | CÓD: {log.toolCode}</span>
                                                                        </td>
                                                                        <td className="p-4 text-center">
                                                                            <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase ${log.type === 'RETIRADA' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                                                                {log.type}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-4">
                                                                            <span className="text-slate-800 leading-tight block">{log.personName}</span>
                                                                            <span className="text-[8px] font-semibold text-slate-400">CPF: {log.personCpf}</span>
                                                                        </td>
                                                                        <td className="p-4 text-slate-500">{log.responsible}</td>
                                                                        <td className="p-4 text-center">
                                                                            {isNotReturned ? (
                                                                                <span className="inline-block px-2 py-1 rounded text-[9px] font-black uppercase bg-red-600 text-white shadow-sm shadow-red-200 animate-pulse">
                                                                                    NÃO DEVOLVIDA
                                                                                </span>
                                                                            ) : log.type === 'RETIRADA' ? (
                                                                                <span className="inline-block px-2 py-1 rounded text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                                                    DEVOLVIDA
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-block px-2 py-1 rounded text-[8px] font-black uppercase bg-slate-50 text-slate-400 border border-slate-100">
                                                                                    -
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-4">
                                                                            {log.type === 'RETIRADA' ? (
                                                                                <div>
                                                                                    <span className="text-[8px] text-slate-400 block font-normal">PREV. RETORNO</span>
                                                                                    {log.expectedReturnDate ? new Date(log.expectedReturnDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                                                                                </div>
                                                                            ) : (
                                                                                <div>
                                                                                    <span className="text-[8px] text-slate-400 block font-normal">ESTADO RETORNO</span>
                                                                                    {log.condition}
                                                                                </div>
                                                                            )}
                                                                            {log.observations && log.observations !== 'SEM OBSERVAÇÕES' && (
                                                                                <span className="block text-[8px] font-semibold text-slate-400 mt-0.5 lowercase normal-case italic">"{log.observations}"</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                )})
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                 {/* Tool Modal Dialog was moved to the root level to prevent z-index stacking context overlap */}
                            </div>
                        ) : (
                            <div className="p-4 md:p-6 space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Register Temp Form */}
                                    <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl space-y-4 shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                            <Plus className="h-4 w-4 text-indigo-500" />
                                            Novo Registro de Temperatura
                                        </h3>

                                        <form onSubmit={handleRegisterTemperature} className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Câmara Fria</label>
                                                <select 
                                                    value={tempChamber}
                                                    onChange={e => setTempChamber(e.target.value as any)}
                                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                >
                                                    <option value="Câmara Fria de Resfriados">Câmara Fria de Resfriados (Resfriados)</option>
                                                    <option value="Câmara Fria de Congelados">Câmara Fria de Congelados (Congelados)</option>
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Data</label>
                                                    <input 
                                                        type="date"
                                                        value={tempDate}
                                                        onChange={e => setTempDate(e.target.value)}
                                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Período</label>
                                                    <select 
                                                        value={tempPeriod}
                                                        onChange={e => setTempPeriod(e.target.value as any)}
                                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                    >
                                                        <option value="MANHÃ">Manhã (7h - 11h)</option>
                                                        <option value="TARDE">Tarde (13h - 17h)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Temperatura (°C)</label>
                                                    <input 
                                                        type="number"
                                                        step="0.1"
                                                        value={tempValue}
                                                        onChange={e => setTempValue(e.target.value)}
                                                        placeholder="Ex: -18.5 ou 4.2"
                                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Hora da Medição</label>
                                                    <input 
                                                        type="time"
                                                        value={tempTime}
                                                        onChange={e => setTempTime(e.target.value)}
                                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Responsável pela Medição</label>
                                                <input 
                                                    type="text"
                                                    value={tempResponsible}
                                                    onChange={e => setTempResponsible(e.target.value)}
                                                    placeholder="Nome ou Matrícula"
                                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Observações / Correções</label>
                                                <textarea 
                                                    value={tempObservations}
                                                    onChange={e => setTempObservations(e.target.value)}
                                                    placeholder="Ações corretivas, se fora da faixa recomendada..."
                                                    className="w-full p-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs h-20 resize-none"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isSavingTemp}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl uppercase tracking-wider text-[10px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Save className="h-4 w-4" />
                                                {isSavingTemp ? 'Salvando...' : 'Gravar Temperatura'}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Print and Digital logs list */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* Print Controller Panel */}
                                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl space-y-4 shadow-sm">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                                        <Printer className="h-4 w-4 text-emerald-500" />
                                                        Gerador de Folha de Registro & Impressão
                                                    </h3>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1">Gere a folha mensal para controle físico manual ou com registros digitais integrados</p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handlePrintTemperatureReport}
                                                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-6 rounded-xl uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
                                                >
                                                    <Printer className="h-3.5 w-3.5" />
                                                    Imprimir Folha Mensal
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Mês de Referência</label>
                                                    <select 
                                                        value={tempFilterMonth}
                                                        onChange={e => setTempFilterMonth(e.target.value)}
                                                        className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-emerald-400 transition-all text-[10px] uppercase cursor-pointer"
                                                    >
                                                        {MONTHS_PT.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Ano de Referência</label>
                                                    <select 
                                                        value={tempFilterYear}
                                                        onChange={e => setTempFilterYear(Number(e.target.value))}
                                                        className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-emerald-400 transition-all text-[10px] uppercase cursor-pointer"
                                                    >
                                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Câmara de Referência</label>
                                                    <select 
                                                        value={tempChamber}
                                                        onChange={e => setTempChamber(e.target.value as any)}
                                                        className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-emerald-400 transition-all text-[10px] uppercase cursor-pointer"
                                                    >
                                                        <option value="Câmara Fria de Resfriados">Câmara de Resfriados</option>
                                                        <option value="Câmara Fria de Congelados">Câmara de Congelados</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Digital logs history */}
                                        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-indigo-500" />
                                                Histórico Digital ({tempFilterMonth} / {tempFilterYear})
                                            </h3>

                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse text-left text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px]">
                                                            <th className="py-3 px-4">Data</th>
                                                            <th className="py-3 px-4">Período</th>
                                                            <th className="py-3 px-4 text-center">Hora</th>
                                                            <th className="py-3 px-4 text-center">Temp (°C)</th>
                                                            <th className="py-3 px-4">Responsável</th>
                                                            <th className="py-3 px-4">Observações</th>
                                                            <th className="py-3 px-4 text-right">Ação</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {ensureArray(temperatureLogs)
                                                            .filter((log: any) => {
                                                                if (!log) return false;
                                                                const logDate = new Date(log.date + 'T12:00:00');
                                                                const logMonth = MONTHS_PT[logDate.getMonth()];
                                                                const logYear = logDate.getFullYear();
                                                                return logMonth === tempFilterMonth && logYear === tempFilterYear && log.chamber === tempChamber;
                                                            })
                                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                            .map((log: any, idx: number) => {
                                                                const isFreezer = log.chamber === 'Câmara Fria de Congelados';
                                                                const isOutsideRange = isFreezer ? (log.value > -18) : (log.value < 0 || log.value > 10);
                                                                return (
                                                                    <tr key={log.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50 font-medium text-slate-700">
                                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                                            {new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                                        </td>
                                                                        <td className="py-3 px-4">
                                                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${log.period === 'MANHÃ' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                                                                {log.period}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3 px-4 text-center font-bold text-slate-600">
                                                                            {log.time || '-'}
                                                                        </td>
                                                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                                                            <span className={`px-3 py-1 rounded-xl text-xs font-black ${isOutsideRange ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                                                {log.value} °C
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3 px-4">{log.responsible}</td>
                                                                        <td className="py-3 px-4 max-w-xs truncate text-[10px]" title={log.observations}>
                                                                            {log.observations || '-'}
                                                                        </td>
                                                                        <td className="py-3 px-4 text-right">
                                                                            <button 
                                                                                onClick={() => handleDeleteTemperature(log.id)}
                                                                                className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 active:scale-95 transition-all inline-block"
                                                                                title="Excluir"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        {ensureArray(temperatureLogs).filter((log: any) => {
                                                            if (!log) return false;
                                                            const logDate = new Date(log.date + 'T12:00:00');
                                                            const logMonth = MONTHS_PT[logDate.getMonth()];
                                                            const logYear = logDate.getFullYear();
                                                            return logMonth === tempFilterMonth && logYear === tempFilterYear && log.chamber === tempChamber;
                                                        }).length === 0 && (
                                                            <tr>
                                                                <td colSpan={7} className="py-8 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">
                                                                    Nenhuma medição digital registrada para esta câmara no mês selecionado.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            {/* Tool Modal Dialog - rendered at root level with z-[9999] to avoid z-index stacking issues */}
            {isToolModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4" id="tool-modal">
                    <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-fade-in">
                        <div className="bg-zinc-900 text-white p-5 flex justify-between items-center italic">
                            <div className="flex items-center gap-2">
                                <Wrench className="h-5 w-5 text-indigo-400" />
                                <h3 className="font-black uppercase tracking-tighter text-sm leading-none">
                                    {editingToolId ? 'Editar Ferramenta' : 'Cadastrar Ferramenta'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsToolModalOpen(false)}
                                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTool} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nome da Ferramenta</label>
                                <input
                                    type="text"
                                    value={newTool.name}
                                    onChange={e => setNewTool(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: FURADEIRA DE IMPACTO"
                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Marca / Modelo</label>
                                    <input
                                        type="text"
                                        value={newTool.model}
                                        onChange={e => setNewTool(prev => ({ ...prev, model: e.target.value }))}
                                        placeholder="Ex: BOSCH GSB 13 RE"
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Categoria</label>
                                    <select
                                        value={newTool.category}
                                        onChange={e => setNewTool(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs cursor-pointer"
                                    >
                                        <option value="MANUAL">Manual</option>
                                        <option value="ELÉTRICA">Elétrica</option>
                                        <option value="MEDIÇÃO">Medição</option>
                                        <option value="EPI">EPI</option>
                                        <option value="OUTROS">Outros</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">No. Cadastro (Patrimônio)</label>
                                    <input
                                        type="text"
                                        value={newTool.registerNumber}
                                        onChange={e => setNewTool(prev => ({ ...prev, registerNumber: e.target.value }))}
                                        placeholder="Ex: CAD-0104"
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cód. Específico</label>
                                    <input
                                        type="text"
                                        value={newTool.toolCode}
                                        onChange={e => setNewTool(prev => ({ ...prev, toolCode: e.target.value }))}
                                        placeholder="Ex: FUR-01"
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Local de Armazenamento</label>
                                    <input
                                        type="text"
                                        value={newTool.location}
                                        onChange={e => setNewTool(prev => ({ ...prev, location: e.target.value }))}
                                        placeholder="Ex: GAVETA 3 / ARMÁRIO B"
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Status Inicial</label>
                                    <select
                                        value={newTool.status}
                                        onChange={e => setNewTool(prev => ({ ...prev, status: e.target.value }))}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs cursor-pointer"
                                        disabled={!!editingToolId}
                                    >
                                        <option value="DISPONÍVEL">Disponível</option>
                                        <option value="EMPRESTADO">Emprestado</option>
                                        <option value="MANUTENÇÃO">Em Manutenção</option>
                                        <option value="DANIFICADO">Danificada / Inoperante</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsToolModalOpen(false)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-3 rounded-xl uppercase tracking-wider text-[10px] transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl uppercase tracking-wider text-[10px] transition-all"
                                >
                                    Salvar Registro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </main>
            <style>{`
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default AlmoxarifadoDashboard;