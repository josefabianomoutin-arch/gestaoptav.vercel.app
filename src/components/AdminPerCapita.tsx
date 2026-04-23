

import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import type { Supplier, PerCapitaConfig, WarehouseMovement, AcquisitionItem, Delivery } from '../types';
import AdminAcquisitionItems from './AdminAcquisitionItems';
import AdminPerCapitaSuppliers from './AdminPerCapitaSuppliers';
import AdminAtaGenerator from './AdminAtaGenerator';
import AdminContractGenerator from './AdminContractGenerator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { PerCapitaSupplier } from '../types';

interface AdminPerCapitaProps {
  suppliers: Supplier[];
  warehouseLog: WarehouseMovement[];
  perCapitaConfig: PerCapitaConfig;
  onUpdatePerCapitaConfig: (config: PerCapitaConfig) => Promise<any>;
  onUpdateContractForItem: (itemName: string, assignments: { supplierCpf: string, totalKg: number, valuePerKg: number, unit?: string, category?: string, comprasCode?: string, becCode?: string }[]) => Promise<{ success: boolean, message: string }>;
  onUpdateAcquisitionItem: (item: AcquisitionItem) => Promise<{ success: boolean, message: string }>;
  onDeleteAcquisitionItem: (id: string) => Promise<{ success: boolean, message: string }>;
  acquisitionItems: AcquisitionItem[];
  onUpdateSupplierObservations?: (cpf: string, observations: string) => Promise<{ success: boolean; message?: string }>;
  onSyncPPAISToAgenda?: () => Promise<void>;
}

const formatCurrency = (value: number) => {
    if (isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const normalizeItemName = (name: string): string => {
    return (name || '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[;,. -/]/g, " ")    // Troca separadores por espaço
        .replace(/\s+/g, " ")           // Remove espaços duplos
        .trim()
        .toUpperCase();
};

const hortifrutiKeywords = [
    'abacate', 'abacaxi', 'abóbora', 'abobrinha', 'acelga', 'agrião', 'alface', 
    'banana', 'batata', 'berinjela', 'beterraba', 'brócolis', 'caqui', 'cará', 
    'cebola', 'cebolinha', 'cenoura', 'chuchu', 'couve', 'escarola', 'espinafre', 
    'goiaba', 'inhame', 'jiló', 'laranja', 'limão', 'maçã', 'mamão', 'mandioca', 
    'manga', 'maracujá', 'melancia', 'melão', 'milho', 'moranga', 'mostarda', 
    'pepino', 'pêra', 'pimentão', 'quiabo', 'rabanete', 'repolho', 'rúcula', 
    'salsa', 'tomate', 'uva', 'vagem'
];

const perishablesKeywords = [
    'carne', 'frango', 'suína', 'peixe', 'bovina', 'almôndega', 'embutido', 
    'linguiça', 'salsicha', 'fígado', 'dobradinha', 'charque', 'costela', 'pé', 
    'toucinho', 'bisteca', 'lombo', 'pernil', 'hambúrguer', 'ovo', 'atum', 'sardinha'
];

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const isHortifrutiOrPerishable = (itemName: string): boolean => {
    const lowerItemName = itemName.toLowerCase();
    const allKeywords = [...hortifrutiKeywords, ...perishablesKeywords];
    return allKeywords.some(keyword => lowerItemName.includes(keyword));
};

const getSeiValue = (map: Record<string, string>, tab: string) => (map && tab) ? map[tab] || '' : '';

const AdminPerCapita: React.FC<AdminPerCapitaProps> = ({ 
    suppliers, 
    perCapitaConfig, 
    onUpdatePerCapitaConfig, 
    onUpdateContractForItem, 
    onUpdateAcquisitionItem, 
    onDeleteAcquisitionItem, 
    acquisitionItems, 
    onUpdateSupplierObservations,
    onSyncPPAISToAgenda
}) => {
    const [selectedProducer, setSelectedProducer] = useState<PerCapitaSupplier | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'CALCULO' | 'KIT PPL' | 'PPAIS' | 'ESTOCÁVEIS' | 'PERECÍVEIS' | 'AUTOMAÇÃO' | 'PRODUTOS DE LIMPEZA' | 'ADIANTAMENTOS' | 'CONTROLE' | 'AUDIT'>('CALCULO');
    const [ppaisSubTab, setPpaisSubTab] = useState<'ITEMS' | 'PRODUCERS' | 'CONTRACT' | 'ATA' | 'SCHEDULE'>('ITEMS');
    const [pereciveisSubTab, setPereciveisSubTab] = useState<'ITEMS' | 'SUPPLIERS' | 'CONTRACT' | 'SCHEDULE'>('ITEMS');
    const [staffCount, setStaffCount] = useState<number>(0);
    const [inmateCount, setInmateCount] = useState<number>(0);
    const [customPerCapita, setCustomPerCapita] = useState<Record<string, string>>({});
    const [seiProcessNumbers, setSeiProcessNumbers] = useState<Record<string, string>>({});
    const [seiProcessDefinitions, setSeiProcessDefinitions] = useState<Record<string, string>>({});
    const [monthlyQuota, setMonthlyQuota] = useState<Record<string, number>>({});
    const [monthlyResource, setMonthlyResource] = useState<Record<string, number>>({});
    const [ptresResources, setPtresResources] = useState<Record<string, { pieces: number; services: number }>>({});
    const [ppaisProducers, setPpaisProducers] = useState<PerCapitaSupplier[]>([]);
    const [pereciveisSuppliers, setPereciveisSuppliers] = useState<PerCapitaSupplier[]>([]);
    const [estocaveisSuppliers, setEstocaveisSuppliers] = useState<PerCapitaSupplier[]>([]);
    const [monthlyAdvances, setMonthlyAdvances] = useState<Record<string, number>>({});
    const [showComparison, setShowComparison] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [comparisonFilter, setComparisonFilter] = useState<'TODOS' | 'SEM_ENTREGA' | 'ATENCAO' | 'AVANCADO' | 'CONCLUIDO' | 'COM_EMPENHO'>('TODOS');

    useLayoutEffect(() => {
        if (!perCapitaConfig) return;
        
        console.log("AdminPerCapita: Sincronizando estados com perCapitaConfig", perCapitaConfig);
        if (perCapitaConfig.staffCount !== staffCount) setStaffCount(perCapitaConfig.staffCount || 0);
        if (perCapitaConfig.inmateCount !== inmateCount) setInmateCount(perCapitaConfig.inmateCount || 0);
        if (JSON.stringify(perCapitaConfig.customValues) !== JSON.stringify(customPerCapita)) setCustomPerCapita(perCapitaConfig.customValues || {});
        if (JSON.stringify(perCapitaConfig.seiProcessNumbers) !== JSON.stringify(seiProcessNumbers)) setSeiProcessNumbers(perCapitaConfig.seiProcessNumbers || {});
        if (JSON.stringify(perCapitaConfig.seiProcessDefinitions) !== JSON.stringify(seiProcessDefinitions)) setSeiProcessDefinitions(perCapitaConfig.seiProcessDefinitions || {});
        if (JSON.stringify(perCapitaConfig.monthlyQuota) !== JSON.stringify(monthlyQuota)) setMonthlyQuota(perCapitaConfig.monthlyQuota || {});
        if (JSON.stringify(perCapitaConfig.monthlyResource) !== JSON.stringify(monthlyResource)) setMonthlyResource(perCapitaConfig.monthlyResource || {});
        if (JSON.stringify(perCapitaConfig.ptresResources) !== JSON.stringify(ptresResources)) setPtresResources(perCapitaConfig.ptresResources || {});
        if (JSON.stringify(perCapitaConfig.ppaisProducers) !== JSON.stringify(ppaisProducers)) setPpaisProducers(perCapitaConfig.ppaisProducers || []);
        if (JSON.stringify(perCapitaConfig.pereciveisSuppliers) !== JSON.stringify(pereciveisSuppliers)) setPereciveisSuppliers(perCapitaConfig.pereciveisSuppliers || []);
        if (JSON.stringify(perCapitaConfig.estocaveisSuppliers) !== JSON.stringify(estocaveisSuppliers)) setEstocaveisSuppliers(perCapitaConfig.estocaveisSuppliers || []);
        if (JSON.stringify(perCapitaConfig.monthlyAdvances) !== JSON.stringify(monthlyAdvances)) setMonthlyAdvances(perCapitaConfig.monthlyAdvances || {});
        setIsDirty(false);
    }, [perCapitaConfig]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        const newConfig: PerCapitaConfig = {
            staffCount,
            inmateCount,
            customValues: customPerCapita,
            seiProcessNumbers,
            seiProcessDefinitions,
            monthlyQuota,
            monthlyResource,
            ptresResources,
            ppaisProducers,
            pereciveisSuppliers,
            estocaveisSuppliers,
            monthlyAdvances,
        };
        try {
            await onUpdatePerCapitaConfig(newConfig);
            setIsDirty(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to save per capita config:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleStaffCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setStaffCount(parseInt(e.target.value, 10) || 0);
        setIsDirty(true);
    };

    const handleInmateCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInmateCount(parseInt(e.target.value, 10) || 0);
        setIsDirty(true);
    };

    const handleSeiNumberChange = (category: string, value: string) => {
        setSeiProcessNumbers(prev => ({ ...prev, [category]: value }));
        setIsDirty(true);
    };

    const handleSeiDefinitionChange = (category: string, value: string) => {
        setSeiProcessDefinitions(prev => ({ ...prev, [category]: value }));
        setIsDirty(true);
    };

    const handleMonthlyValueChange = (type: 'quota' | 'resource', month: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        if (type === 'quota') {
            setMonthlyQuota(prev => ({ ...prev, [month]: numValue }));
        } else {
            setMonthlyResource(prev => ({ ...prev, [month]: numValue }));
        }
        setIsDirty(true);
    };

    const handleMonthlyAdvanceChange = (month: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setMonthlyAdvances(prev => ({ ...prev, [month]: numValue }));
        setIsDirty(true);
    };

    const handleUpdateProducers = async (newProducers: PerCapitaSupplier[]) => {
        setPpaisProducers(newProducers);
        const newConfig: PerCapitaConfig = {
            staffCount,
            inmateCount,
            customValues: customPerCapita,
            seiProcessNumbers,
            seiProcessDefinitions,
            monthlyQuota,
            monthlyResource,
            ptresResources,
            ppaisProducers: newProducers,
            pereciveisSuppliers,
            estocaveisSuppliers,
            monthlyAdvances,
        };
        try {
            await onUpdatePerCapitaConfig(newConfig);
            setIsDirty(false);
        } catch (error) {
            console.error("Failed to save producers:", error);
            toast.error("Erro ao salvar produtores.");
        }
    };

    const handleUpdatePereciveisSuppliers = async (newSuppliers: PerCapitaSupplier[]) => {
        setPereciveisSuppliers(newSuppliers);
        const newConfig: PerCapitaConfig = {
            staffCount,
            inmateCount,
            customValues: customPerCapita,
            seiProcessNumbers,
            seiProcessDefinitions,
            monthlyQuota,
            monthlyResource,
            ptresResources,
            ppaisProducers,
            pereciveisSuppliers: newSuppliers,
            estocaveisSuppliers,
            monthlyAdvances,
        };
        try {
            await onUpdatePerCapitaConfig(newConfig);
            setIsDirty(false);
        } catch (error) {
            console.error("Failed to save suppliers:", error);
            toast.error("Erro ao salvar fornecedores.");
        }
    };

    const handleUpdateEstocaveisSuppliers = async (newSuppliers: PerCapitaSupplier[]) => {
        setEstocaveisSuppliers(newSuppliers);
        const newConfig: PerCapitaConfig = {
            staffCount,
            inmateCount,
            customValues: customPerCapita,
            seiProcessNumbers,
            seiProcessDefinitions,
            monthlyQuota,
            monthlyResource,
            ptresResources,
            ppaisProducers,
            pereciveisSuppliers,
            estocaveisSuppliers: newSuppliers,
            monthlyAdvances,
        };
        try {
            await onUpdatePerCapitaConfig(newConfig);
            setIsDirty(false);
        } catch (error) {
            console.error("Failed to save suppliers:", error);
            toast.error("Erro ao salvar fornecedores.");
        }
    };

    const ppaisAsSuppliers = useMemo(() => {
        return ppaisProducers.map(p => ({
            ...p,
            cpf: p.cpfCnpj,
            deliveries: p.deliveries || [],
            allowedWeeks: [],
            initialValue: Object.values(p.contractItems || {}).reduce((acc: any, curr: any) => acc + (curr.totalKg * (curr.valuePerKg || 0)), 0)
        } as Supplier));
    }, [ppaisProducers]);

    const pereciveisAsSuppliers = useMemo(() => {
        return pereciveisSuppliers.map(p => ({
            ...p,
            cpf: p.cpfCnpj,
            deliveries: p.deliveries || [],
            allowedWeeks: [],
            initialValue: Object.values(p.contractItems || {}).reduce((acc: any, curr: any) => acc + (curr.totalKg * (curr.valuePerKg || 0)), 0)
        } as Supplier));
    }, [pereciveisSuppliers]);

    const handleUpdateContractForPpais = async (itemName: string, assignments: any[]) => {
        const normalizedNew = normalizeItemName(itemName);
        const updatedProducers = ppaisProducers.map(producer => {
            const assignment = assignments.find(a => a.supplierCpf === producer.cpfCnpj);
            const newContractItems = Object.values(producer.contractItems || {}).filter((ci: any) => {
                const normalizedCi = normalizeItemName(ci.name);
                // Remove if it's the same name or if the new name is a more detailed version of the old one
                return normalizedCi !== normalizedNew && !normalizedNew.startsWith(normalizedCi);
            });
            if (assignment) {
                newContractItems.push({
                    name: itemName,
                    totalKg: assignment.totalKg,
                    valuePerKg: assignment.valuePerKg,
                    unit: assignment.unit,
                    category: assignment.category,
                    comprasCode: assignment.comprasCode,
                    becCode: assignment.becCode,
                    period: '2_3_QUAD'
                });
            }
            return { ...producer, contractItems: newContractItems };
        });
        await handleUpdateProducers(updatedProducers);
        return { success: true, message: 'Contratos de produtores atualizados' };
    };

    const handleUpdateContractForPereciveis = async (itemName: string, assignments: any[]) => {
        const normalizedNew = normalizeItemName(itemName);
        const updatedSuppliers = pereciveisSuppliers.map(supplier => {
            const assignment = assignments.find(a => a.supplierCpf === supplier.cpfCnpj);
            const newContractItems = Object.values(supplier.contractItems || {}).filter((ci: any) => {
                const normalizedCi = normalizeItemName(ci.name);
                // Remove if it's the same name or if the new name is a more detailed version of the old one
                return normalizedCi !== normalizedNew && !normalizedNew.startsWith(normalizedCi);
            });
            if (assignment) {
                newContractItems.push({
                    name: itemName,
                    totalKg: assignment.totalKg,
                    valuePerKg: assignment.valuePerKg,
                    unit: assignment.unit,
                    category: assignment.category,
                    comprasCode: assignment.comprasCode,
                    becCode: assignment.becCode,
                    period: '2_3_QUAD'
                });
            }
            return { ...supplier, contractItems: newContractItems };
        });
        await handleUpdatePereciveisSuppliers(updatedSuppliers);
        return { success: true, message: 'Contratos de fornecedores atualizados' };
    };

    const contractItemNamesByCategory = useMemo(() => {
        const result: Record<string, string[]> = {
            'PPAIS': [],
            'PERECÍVEIS': [],
            'OTHERS': []
        };

        const ppaisNames = new Set<string>();
        ppaisProducers.forEach(s => {
            Object.values(s.contractItems || {}).forEach((ci: any) => ppaisNames.add(ci.name));
        });
        result['PPAIS'] = Array.from(ppaisNames).sort();

        const pereciveisNames = new Set<string>();
        pereciveisSuppliers.forEach(s => {
            Object.values(s.contractItems || {}).forEach((ci: any) => pereciveisNames.add(ci.name));
        });
        result['PERECÍVEIS'] = Array.from(pereciveisNames).sort();

        const otherNames = new Set<string>();
        suppliers.forEach(s => {
            Object.values(s.contractItems || {}).forEach((ci: any) => otherNames.add(ci.name));
        });
        result['OTHERS'] = Array.from(otherNames).sort();

        return result;
    }, [suppliers, ppaisProducers, pereciveisSuppliers]);

    const itemData = useMemo(() => {
      const data = new Map<string, { totalQuantity: number; totalValue: number; unit: string; category: string }>();
      
      const allSources = [...suppliers, ...ppaisAsSuppliers, ...pereciveisAsSuppliers];
      
      allSources.forEach(p => {
        Object.values(p.contractItems || {}).forEach((item: any) => {
          const current = data.get(item.name) || { 
            totalQuantity: 0, 
            totalValue: 0, 
            unit: item.unit || 'kg-1',
            category: item.category || 'OUTROS'
          };
          
          current.totalQuantity += item.totalKg;

          const itemTotalValue = (item.totalKg || 0) * (item.valuePerKg || 0);
          current.totalValue += itemTotalValue;

          data.set(item.name, current);
        });
      });
      return Array.from(data.entries())
        .map(([name, values]) => ({ name, ...values }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }, [suppliers, ppaisAsSuppliers, pereciveisAsSuppliers]);

    const perCapitaDenominator = useMemo(() => {
        return inmateCount + staffCount;
    }, [inmateCount, staffCount]);

    const totalPerCapitaKg = useMemo(() => {
        if (perCapitaDenominator === 0) return 0;
        
        // Cálculo ponderado da média mensal de peso
        let totalMonthlyWeight = 0;
        const categoriesToCalculate = ['PPAIS', 'ESTOCÁVEIS', 'PERECÍVEIS', 'KIT PPL', 'PRODUTOS DE LIMPEZA', 'AUTOMAÇÃO'];
        
        categoriesToCalculate.forEach(cat => {
            // Tentar obter dados do planejamento (acquisitionItems) e do contrato (itemData)
            const acqItems = acquisitionItems.filter(ai => ai.category === cat);
            
            const catWeight = acqItems.reduce((sum, ai) => {
                const contracted = itemData.find(id => normalizeItemName(id.name) === normalizeItemName(ai.name));
                const weight = (contracted && contracted.totalQuantity > 0) ? contracted.totalQuantity : (ai.acquiredQuantity || 0);
                
                const [unitType] = (ai.unit || 'kg-1').split('-');
                if (['litro', 'embalagem', 'caixa', 'dz'].some(u => unitType.includes(u))) return sum;
                return sum + weight;
            }, 0);

            // Adicionar itens que estão no contrato mas não no planejamento
            const onlyContractWeight = itemData
                .filter(id => id.category === cat && !acqItems.some(ai => normalizeItemName(ai.name) === normalizeItemName(id.name)))
                .reduce((sum, id) => {
                    const [unitType] = (id.unit || 'kg-1').split('-');
                    if (['litro', 'embalagem', 'caixa', 'dz'].some(u => unitType.includes(u))) return sum;
                    return sum + (id.totalQuantity || 0);
                }, 0);

            const finalCatWeight = catWeight + onlyContractWeight;
            if (finalCatWeight === 0) return;

            // Divisor padrão de 12 meses para uma estimativa anual diluída, 
            // ou ajuste conforme a natureza do contrato (ex: PPAIS costuma ser semestral/anual)
            let divisor = 12;
            if (cat === 'PERECÍVEIS' || cat === 'ESTOCÁVEIS') {
                divisor = 4;
            } else if (cat === 'PPAIS') {
                divisor = 8;
            }
            totalMonthlyWeight += finalCatWeight / divisor;
        });

        // Média mensal dividida por 30 para obter a média diária
        return (totalMonthlyWeight / perCapitaDenominator) / 30;
    }, [itemData, perCapitaDenominator, acquisitionItems]);
    
    const totalPerCapitaValue = useMemo(() => {
        if (perCapitaDenominator === 0) return 0;
        
        // Cálculo ponderado da média mensal de valor
        let totalMonthlyValue = 0;
        const categoriesToCalculate = ['PPAIS', 'ESTOCÁVEIS', 'PERECÍVEIS', 'KIT PPL', 'PRODUTOS DE LIMPEZA', 'AUTOMAÇÃO'];

        categoriesToCalculate.forEach(cat => {
            // Tentar obter dados do planejamento (acquisitionItems) e do contrato (itemData)
            const acqItems = acquisitionItems.filter(ai => ai.category === cat);
            const totalFromAcq = acqItems.reduce((sum, ai) => {
                const contracted = itemData.find(id => normalizeItemName(id.name) === normalizeItemName(ai.name));
                if (contracted && contracted.totalValue > 0) return sum + contracted.totalValue;
                return sum + ((ai.unitValue || 0) * (ai.acquiredQuantity || 0));
            }, 0);

            // Adicionar itens que estão no contrato mas não no planejamento
            const totalOnlyInContract = itemData
                .filter(id => id.category === cat && !acqItems.some(ai => normalizeItemName(ai.name) === normalizeItemName(id.name)))
                .reduce((sum, id) => sum + (id.totalValue || 0), 0);

            const finalCatValue = totalFromAcq + totalOnlyInContract;
            if (finalCatValue === 0) return;

            let divisor = 12;
            if (cat === 'PERECÍVEIS' || cat === 'ESTOCÁVEIS') {
                divisor = 4;
            } else if (cat === 'PPAIS') {
                divisor = 8;
            }
            totalMonthlyValue += finalCatValue / divisor;
        });

        // Média mensal dividida por 30 para obter o custo diário
        return (totalMonthlyValue / perCapitaDenominator) / 30;
    }, [itemData, perCapitaDenominator, acquisitionItems]);

    const activeCategories = useMemo(() => {
        return ['PPAIS', 'KIT PPL', 'PERECÍVEIS', 'ESTOCÁVEIS', 'AUTOMAÇÃO', 'PRODUTOS DE LIMPEZA'].filter(cat => {
            return (seiProcessDefinitions[cat] && seiProcessDefinitions[cat].trim() !== '') || 
                   (seiProcessNumbers[cat] && seiProcessNumbers[cat].trim() !== '');
        });
    }, [seiProcessDefinitions, seiProcessNumbers]);

    const monthlyExecution = useMemo(() => {
        const execution: Record<string, Record<string, number>> = {};
        months.forEach(m => {
            execution[m] = {
                'PPAIS': 0,
                'KIT PPL': 0,
                'ESTOCÁVEIS': 0,
                'PERECÍVEIS': 0,
                'AUTOMAÇÃO': 0,
                'PRODUTOS DE LIMPEZA': 0
            };
        });

        const getMonthFromDate = (dateStr?: string) => {
            if (!dateStr) return null;
            const d = new Date(dateStr + 'T12:00:00');
            return months[d.getMonth()];
        };

        // 1. Regular Suppliers
        suppliers.forEach(s => {
            (Object.values(s.deliveries || {}) as Delivery[]).forEach(d => {
                const m = getMonthFromDate(d.date);
                if (!m) return;
                
                const normalizedDelItem = normalizeItemName(d.item || '');
                const acqItem = acquisitionItems.find(ai => normalizeItemName(ai.name) === normalizedDelItem);
                
                if (acqItem) {
                    if (execution[m][acqItem.category] !== undefined) {
                        execution[m][acqItem.category] += d.value || 0;
                    }
                } else {
                    const contractItem = s.contractItems?.find(ci => normalizeItemName(ci.name) === normalizedDelItem);
                    if (contractItem && contractItem.category && contractItem.category !== 'OUTROS') {
                        if (execution[m][contractItem.category] !== undefined) {
                            execution[m][contractItem.category] += d.value || 0;
                        }
                    }
                }
            });
        });

        // 2. PPAIS Producers
        ppaisProducers.forEach(p => {
            (Object.values(p.deliveries || {}) as Delivery[]).forEach(d => {
                const m = getMonthFromDate(d.date);
                if (m) execution[m]['PPAIS'] += d.value || 0;
            });
        });

        // 3. Pereciveis Suppliers
        pereciveisSuppliers.forEach(p => {
            (Object.values(p.deliveries || {}) as Delivery[]).forEach(d => {
                const m = getMonthFromDate(d.date);
                if (m) execution[m]['PERECÍVEIS'] += d.value || 0;
            });
        });

        return execution;
    }, [suppliers, ppaisProducers, pereciveisSuppliers, acquisitionItems]);

    const categoryMonthlyAverages = useMemo(() => {
        const averages: Record<string, number> = {};
        activeCategories.forEach(cat => {
            // Tentar obter dados do planejamento (acquisitionItems) e do contrato (itemData)
            const acqItems = acquisitionItems.filter(ai => ai.category === cat);
            const totalFromAcq = acqItems.reduce((sum, ai) => {
                const contracted = itemData.find(id => normalizeItemName(id.name) === normalizeItemName(ai.name));
                if (contracted && contracted.totalValue > 0) return sum + contracted.totalValue;
                return sum + ((ai.unitValue || 0) * (ai.acquiredQuantity || 0));
            }, 0);

            // Adicionar itens que estão no contrato mas não no planejamento
            const totalOnlyInContract = itemData
                .filter(id => id.category === cat && !acqItems.some(ai => normalizeItemName(ai.name) === normalizeItemName(id.name)))
                .reduce((sum, id) => sum + (id.totalValue || 0), 0);

            const total = totalFromAcq + totalOnlyInContract;
            
            let divisor: number;
            if (cat === 'PERECÍVEIS') {
                divisor = 4; // Apenas Maio, Junho, Julho, Agosto
            } else if (cat === 'PPAIS') {
                divisor = 8; // Maio a Dezembro
            } else {
                // Média mensal: 4 meses para Jan-Abr, 8 meses para Mai-Dez
                const currentMonth = new Date().getMonth();
                divisor = currentMonth <= 3 ? 4 : 8;
            }
            averages[cat] = total / divisor;
        });
        return averages;
    }, [activeCategories, itemData, acquisitionItems]);

    const getIsActiveMonth = (month: string, category: string) => {
        if (category === 'PERECÍVEIS') {
            return ['Maio', 'Junho', 'Julho', 'Agosto'].includes(month);
        }
        if (category === 'PPAIS') {
            return ['Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].includes(month);
        }
        // Para outras categorias, manter o comportamento de quadrimesters se aplicável
        // ou retornar true se for anual. 
        // Baseado no código original, retornava true para tudo.
        return true;
    };

    const financialSummary = useMemo(() => {
        const totalGeralGasto = activeCategories.reduce((sum, cat) => {
            let catTotal = 0;
            months.forEach(month => {
                const execVal = monthlyExecution[month]?.[cat] || 0;
                const isActiveMonth = getIsActiveMonth(month, cat);
                const futureVal = isActiveMonth ? (categoryMonthlyAverages[cat] || 0) : 0;
                if (isActiveMonth) {
                    catTotal += execVal > 0 ? execVal : futureVal;
                }
            });
            return sum + catTotal;
        }, 0) + (Object.values(monthlyAdvances) as number[]).reduce((a: number, b: number) => a + (b || 0), 0);

        const totalGeralCotas = (Object.values(monthlyQuota) as number[]).reduce((a: number, b: number) => a + (b || 0), 0);
        
        const diff = totalGeralGasto - totalGeralCotas;
        
        return {
            totalGeralGasto,
            totalGeralCotas,
            diff
        };
    }, [activeCategories, monthlyExecution, categoryMonthlyAverages, monthlyAdvances, monthlyQuota]);

    const deliveryStats = useMemo(() => {
        const stats: Record<string, { name: string, total: number, value: number }> = {};
        const allSources = [...(suppliers || []), ...ppaisAsSuppliers, ...pereciveisAsSuppliers];
        
        allSources.forEach(s => {
            const deliveries = (Object.values(s.deliveries || {}) as any[]);
            deliveries.forEach(d => {
                if (d.kg > 0) {
                    const itemName = d.item || 'Outros';
                    if (!stats[itemName]) {
                        stats[itemName] = { name: itemName, total: 0, value: 0 };
                    }
                    stats[itemName].total += d.kg;
                    stats[itemName].value += (d.value || 0);
                }
            });
        });
        
        return Object.values(stats).sort((a, b) => b.total - a.total).slice(0, 10); // Top 10 items
    }, [suppliers, ppaisAsSuppliers, pereciveisAsSuppliers]);

    const auditInconsistencies = useMemo(() => {
        const issues: { type: string, description: string, supplierName?: string, itemName?: string, category?: string, fix: () => Promise<void> }[] = [];
        
        const acqItemNames = new Set(acquisitionItems.map(ai => normalizeItemName(ai.name)));
        
        // 1. Check for items in supplier contracts that don't exist in acquisition items
        suppliers.forEach(s => {
            (Object.values(s.contractItems || {}) as any[]).forEach(ci => {
                const normalizedCi = normalizeItemName(ci.name);
                if (!acqItemNames.has(normalizedCi)) {
                    issues.push({
                        type: 'Item Fantasma',
                        description: `O item "${ci.name}" está no contrato de ${s.name} mas não existe no Planejamento Per Capita.`,
                        supplierName: s.name,
                        itemName: ci.name,
                        fix: async () => {
                            await onUpdateContractForItem(ci.name, []); 
                            toast.success(`Item "${ci.name}" removido de ${s.name}`);
                        }
                    });
                }
            });
        });

        // 2. Check for producers/pereciveis in perCapitaConfig with ghost items
        ppaisProducers.forEach(p => {
            (Object.values(p.contractItems || {}) as any[]).forEach(ci => {
                const normalizedCi = normalizeItemName(ci.name);
                if (!acqItemNames.has(normalizedCi)) {
                    issues.push({
                        type: 'Item Fantasma (PPAIS)',
                        description: `O item "${ci.name}" está no contrato PPAIS de ${p.name} mas não existe no Planejamento Per Capita.`,
                        supplierName: p.name,
                        itemName: ci.name,
                        fix: async () => {
                            const updatedProducers = ppaisProducers.map(prod => {
                                if (prod.cpfCnpj === p.cpfCnpj) {
                                    return { ...prod, contractItems: (prod.contractItems || []).filter(item => normalizeItemName(item.name) !== normalizedCi) };
                                }
                                return prod;
                            });
                            await handleUpdateProducers(updatedProducers);
                            toast.success(`Item "${ci.name}" removido de ${p.name}`);
                        }
                    });
                }
            });
        });

        pereciveisSuppliers.forEach(p => {
            (Object.values(p.contractItems || {}) as any[]).forEach(ci => {
                const normalizedCi = normalizeItemName(ci.name);
                if (!acqItemNames.has(normalizedCi)) {
                    issues.push({
                        type: 'Item Fantasma (Perecíveis)',
                        description: `O item "${ci.name}" está no contrato de Perecíveis de ${p.name} mas não existe no Planejamento Per Capita.`,
                        supplierName: p.name,
                        itemName: ci.name,
                        fix: async () => {
                            const updatedSuppliers = pereciveisSuppliers.map(prod => {
                                if (prod.cpfCnpj === p.cpfCnpj) {
                                    return { ...prod, contractItems: (prod.contractItems || []).filter(item => normalizeItemName(item.name) !== normalizedCi) };
                                }
                                return prod;
                            });
                            await handleUpdatePereciveisSuppliers(updatedSuppliers);
                            toast.success(`Item "${ci.name}" removido de ${p.name}`);
                        }
                    });
                }
            });
        });

        // 3. Check for items in deliveries that are missing from the contract
        const allSources = [...(suppliers || []), ...ppaisAsSuppliers, ...pereciveisAsSuppliers];
        allSources.forEach(s => {
            const contractItemNames = new Set((Object.values(s.contractItems || {}) as any[]).map(ci => normalizeItemName(ci.name)));
            const deliveries = (Object.values(s.deliveries || {}) as any[]);
            
            deliveries.forEach(d => {
                if (d.item && d.item !== 'AGENDAMENTO PENDENTE') {
                    const normalizedItem = normalizeItemName(d.item);
                    if (!contractItemNames.has(normalizedItem)) {
                        issues.push({
                            type: 'Item não Contratado',
                            description: `O item "${d.item}" consta em entregas/agendamentos de ${s.name} mas não está em seu contrato.`,
                            supplierName: s.name,
                            itemName: d.item,
                            fix: async () => {
                                toast.info(`O item "${d.item}" precisa ser vinculado ao contrato de ${s.name} manualmente através do planejamento de itens.`);
                            }
                        });
                    }
                }
            });
        });

        return issues;
    }, [suppliers, ppaisProducers, pereciveisSuppliers, acquisitionItems, onUpdateContractForItem, ppaisAsSuppliers, pereciveisAsSuppliers, handleUpdatePereciveisSuppliers, handleUpdateProducers]);

    const handleFixAllInconsistencies = async () => {
        setIsSaving(true);
        try {
            for (const issue of auditInconsistencies) {
                await issue.fix();
            }
            toast.success('Todas as inconsistências foram corrigidas!');
        } catch (error) {
            toast.error('Erro ao corrigir inconsistências.');
        } finally {
            setIsSaving(false);
        }
    };

    const totalContractValue = useMemo(() => {
        const targetCategories = ['PPAIS', 'ESTOCÁVEIS', 'PERECÍVEIS'];
        let total = 0;
        
        targetCategories.forEach(cat => {
            months.forEach(month => {
                const execVal = monthlyExecution[month]?.[cat] || 0;
                const isActiveMonth = getIsActiveMonth(month, cat);
                const futureVal = isActiveMonth ? (categoryMonthlyAverages[cat] || 0) : 0;
                if (isActiveMonth) {
                    total += execVal > 0 ? execVal : futureVal;
                }
            });
        });
        
        return total;
    }, [monthlyExecution, categoryMonthlyAverages]);

    const contractedItemsSummary = useMemo(() => {
        const summary = new Map<string, { contracted: number; received: number; remaining: number; unit: string; originalName: string; suppliers: Set<string>; empenhos: Set<string>; addendum: number }>();
        const allSources = [...(suppliers || []), ...ppaisAsSuppliers, ...pereciveisAsSuppliers];

        allSources.forEach(supplier => {
            supplier.contractItems?.forEach(item => {
                const normalizedName = normalizeItemName(item.name);
                if (!summary.has(normalizedName)) {
                    const acqItem = acquisitionItems.find(ai => normalizeItemName(ai.name) === normalizedName);
                    summary.set(normalizedName, { 
                        contracted: 0, 
                        received: 0, 
                        remaining: 0, 
                        unit: item.unit || 'KG', 
                        originalName: item.name, 
                        suppliers: new Set(), 
                        empenhos: new Set(),
                        addendum: acqItem?.contractAddendum || 0
                    });
                }
                const data = summary.get(normalizedName)!;
                data.contracted += item.totalKg || 0;
                data.suppliers.add(supplier.name);
                summary.set(normalizedName, data);
            });

            (Object.values(supplier.deliveries || {}) as Delivery[]).forEach(delivery => {
                const normalizedName = normalizeItemName(delivery.item || '');
                if (normalizedName && summary.has(normalizedName)) {
                    const data = summary.get(normalizedName)!;
                    data.received += delivery.kg || 0;
                    if (delivery.receiptTermNumber) {
                        data.empenhos.add(delivery.receiptTermNumber);
                    }
                    summary.set(normalizedName, data);
                }
            });
        });

        const result = Array.from(summary.entries()).map(([name, data]) => {
            const totalContracted = data.contracted + data.addendum;
            const percentage = totalContracted > 0 ? (data.received / totalContracted) * 100 : 0;
            let status = 'NORMAL';
            if (data.received === 0) status = 'SEM_ENTREGA';
            else if (percentage >= 100) status = 'CONCLUIDO';
            else if (percentage >= 70) status = 'AVANCADO';
            else if (percentage < 50) status = 'ATENCAO';

            return {
                name: data.originalName,
                contracted: totalContracted,
                received: data.received,
                remaining: Math.max(0, totalContracted - data.received),
                unit: data.unit,
                percentage,
                status,
                suppliers: Array.from(data.suppliers),
                empenhos: Array.from(data.empenhos),
                hasEmpenho: data.empenhos.size > 0
            };
        }).sort((a, b) => a.name.localeCompare(b.name));

        return result;
    }, [suppliers, ppaisAsSuppliers, pereciveisAsSuppliers, acquisitionItems]);

    const filteredComparison = useMemo(() => {
        if (comparisonFilter === 'TODOS') return contractedItemsSummary;
        if (comparisonFilter === 'SEM_ENTREGA') return contractedItemsSummary.filter(i => i.status === 'SEM_ENTREGA');
        if (comparisonFilter === 'ATENCAO') return contractedItemsSummary.filter(i => i.status === 'ATENCAO');
        if (comparisonFilter === 'AVANCADO') return contractedItemsSummary.filter(i => i.status === 'AVANCADO');
        if (comparisonFilter === 'CONCLUIDO') return contractedItemsSummary.filter(i => i.status === 'CONCLUIDO');
        if (comparisonFilter === 'COM_EMPENHO') return contractedItemsSummary.filter(i => i.hasEmpenho);
        return contractedItemsSummary;
    }, [contractedItemsSummary, comparisonFilter]);

    const suppliersWithoutEmpenho = useMemo(() => {
        if (!suppliers) return [];
        return suppliers.filter(supplier => {
            const hasEmpenho = (Object.values(supplier.deliveries || {}) as Delivery[]).some(d => !!d.receiptTermNumber);
            return !hasEmpenho;
        }).map(supplier => {
            const totalWeight = Object.values(supplier.contractItems || {}).reduce((acc: any, item: any) => acc + (item.totalKg || 0), 0) || 0;
            const totalValue = Object.values(supplier.contractItems || {}).reduce((acc: any, item: any) => acc + ((item.totalKg || 0) * (item.valuePerKg || 0)), 0) || 0;
            const items = Object.values(supplier.contractItems || {}).map((item: any) => ({
                name: item.name,
                contracted: item.totalKg || 0,
                unit: item.unit || 'KG',
                value: (item.totalKg || 0) * (item.valuePerKg || 0)
            })) || [];

            return {
                name: supplier.name,
                document: supplier.cpf,
                totalWeight,
                totalValue,
                items,
                observations: supplier.observations || ''
            };
        }).filter(s => s.totalWeight > 0 || s.totalValue > 0)
          .sort((a, b) => a.name.localeCompare(b.name));
    }, [suppliers]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header de Contexto Profissional */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Módulo Financeiro Ativo</span>
                    </div>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tighter uppercase italic">Controle Per Capita</h2>
                    <p className="text-zinc-500 text-sm font-medium max-w-md mt-1">Gestão de quotas mensais, processos SEI e balanceamento de contratos institucionais.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                            isDirty 
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95' 
                                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                        }`}
                    >
                        {isSaving ? (
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                        {saveSuccess ? 'Alterações Salvas' : 'Salvar Configurações'}
                    </button>
                </div>
            </div>

            {/* Sub-Navegação de Alta Densidade */}
            <div className="flex flex-wrap gap-2 bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200">
                {[
                    { id: 'CALCULO', label: 'Cálculo & Quotas' },
                    { id: 'KIT PPL', label: 'Kit PPL' },
                    { id: 'PPAIS', label: 'PPAIS' },
                    { id: 'ESTOCÁVEIS', label: 'Estocáveis' },
                    { id: 'PERECÍVEIS', label: 'Perecíveis' },
                    { id: 'AUTOMAÇÃO', label: 'Automação' },
                    { id: 'PRODUTOS DE LIMPEZA', label: 'Limpeza' },
                    { id: 'ADIANTAMENTOS', label: 'Adiantamentos' },
                    { id: 'CONTROLE', label: 'Controle' },
                    { id: 'AUDIT', label: 'Auditoria' }
                ].filter(tab => {
                    const currentMonth = new Date().getMonth();
                    if (currentMonth >= 4) {
                        return tab.id !== 'ESTOCÁVEIS' && tab.id !== 'PERECÍVEIS';
                    }
                    return true;
                }).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeSubTab === tab.id 
                                ? 'bg-white text-indigo-600 shadow-sm border border-zinc-200' 
                                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeSubTab === 'ADIANTAMENTOS' ? (
                <div className="animate-fade-in space-y-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-indigo-900 uppercase tracking-tighter italic">Adiantamentos Mensais</h2>
                        <p className="text-gray-400 font-medium">Lançamento de valores de adiantamento para cada mês do ano.</p>
                    </div>

                    <div className="overflow-x-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {months.map(month => (
                                <div key={`advance-${month}`} className="space-y-2">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">{month}</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-300">R$</span>
                                        <input 
                                            type="number"
                                            value={monthlyAdvances[month] || ''}
                                            onChange={(e) => handleMonthlyAdvanceChange(month, e.target.value)}
                                            placeholder="0,00" 
                                            className="w-full p-3 pl-9 bg-gray-50 border-2 border-gray-100 rounded-xl font-mono text-sm focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : activeSubTab === 'CONTROLE' ? (
                <div className="animate-fade-in space-y-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-indigo-900 uppercase tracking-tighter">Controle de Execução de Recursos Mensais</h2>
                        <p className="text-gray-400 font-medium">Acompanhamento dos gastos por categoria em relação à cota mensal disponível.</p>
                    </div>

                    <div className="overflow-x-auto bg-white rounded-2xl shadow-xl border border-gray-100">
                        <table className="w-full text-sm">
                            <thead className="bg-indigo-950 text-white text-[10px] uppercase font-black tracking-widest">
                                <tr>
                                    <th className="p-4 text-left">Mês</th>
                                    <th className="p-4 text-right bg-indigo-900">Cota Mensal</th>
                                    {activeCategories.map(cat => (
                                        <th key={`exec-${cat}`} className="p-4 text-right">{cat}</th>
                                    ))}
                                    <th className="p-4 text-right bg-indigo-700">Adiantamentos</th>
                                    <th className="p-4 text-right bg-indigo-800">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {months.map(month => {
                                    const quota = monthlyQuota[month] || 0;
                                    const exec = monthlyExecution[month];
                                    const advance = monthlyAdvances[month] || 0;
                                    
                                    const totalSpent = activeCategories.reduce((sum, cat) => {
                                        const value = exec[cat] || 0;
                                        const isActiveMonth = getIsActiveMonth(month, cat);
                                        const futureValue = isActiveMonth ? (categoryMonthlyAverages[cat] || 0) : 0;
                                        const displayValue = isActiveMonth ? (value > 0 ? value : futureValue) : 0;
                                        return sum + displayValue;
                                    }, 0) + advance;
                                    
                                    const balance = quota - totalSpent;

                                    return (
                                        <tr key={month} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-black text-gray-700 uppercase">{month}</td>
                                            <td className="p-4 text-right font-mono font-bold text-indigo-600 bg-indigo-50/30">{formatCurrency(quota)}</td>
                                            {activeCategories.map(cat => {
                                                const value = exec[cat] || 0;
                                                const isActiveMonth = getIsActiveMonth(month, cat);
                                                const futureValue = isActiveMonth ? (categoryMonthlyAverages[cat] || 0) : 0;
                                                const displayValue = isActiveMonth ? (value > 0 ? value : futureValue) : 0;
                                                const isFuture = isActiveMonth && value === 0 && futureValue > 0;
                                                
                                                return (
                                                    <td key={`exec-${cat}`} className={`p-4 text-right font-mono ${isFuture ? 'text-blue-600 font-bold bg-blue-50/30' : 'text-indigo-600'}`}>
                                                        {formatCurrency(displayValue)}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 text-right font-mono text-indigo-700 bg-indigo-50/20 font-bold">
                                                {formatCurrency(advance)}
                                            </td>
                                            <td className={`p-4 text-right font-mono font-black bg-indigo-50/50 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(balance)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-100 font-black text-gray-800">
                                <tr>
                                    <td className="p-4 uppercase">Totais Anuais</td>
                                    <td className="p-4 text-right font-mono">
                                        {formatCurrency((Object.values(monthlyQuota) as number[]).reduce((a: number, b: number) => a + (b || 0), 0))}
                                    </td>
                                    {activeCategories.map(cat => {
                                        let catTotal = 0;
                                        months.forEach(month => {
                                            const execVal = monthlyExecution[month]?.[cat] || 0;
                                            const isActiveMonth = getIsActiveMonth(month, cat);
                                            const futureVal = isActiveMonth ? (categoryMonthlyAverages[cat] || 0) : 0;
                                            if (isActiveMonth) {
                                                catTotal += execVal > 0 ? execVal : futureVal;
                                            }
                                        });
                                        return (
                                            <th key={`exec-${cat}`} className="p-4 text-right font-mono">
                                                {formatCurrency(catTotal)}
                                            </th>
                                        );
                                    })}
                                    <th className="p-4 text-right font-mono bg-indigo-700 text-white">
                                        {formatCurrency((Object.values(monthlyAdvances) as number[]).reduce((a: number, b: number) => a + (b || 0), 0))}
                                    </th>
                                    <th className="p-4 text-right font-mono bg-indigo-900 text-white">
                                        {formatCurrency(
                                            (Object.values(monthlyQuota) as number[]).reduce((a: number, b: number) => a + (b || 0), 0) - 
                                            (activeCategories.reduce((sum, cat) => {
                                                let catTotal = 0;
                                                months.forEach(month => {
                                                    const execVal = monthlyExecution[month]?.[cat] || 0;
                                                    const isActiveMonth = getIsActiveMonth(month, cat);
                                                    const futureVal = isActiveMonth ? (categoryMonthlyAverages[cat] || 0) : 0;
                                                    if (isActiveMonth) {
                                                        catTotal += execVal > 0 ? execVal : futureVal;
                                                    }
                                                });
                                                return sum + catTotal;
                                            }, 0) + (Object.values(monthlyAdvances) as number[]).reduce((a: number, b: number) => a + (b || 0), 0))
                                        )}
                                    </th>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-indigo-600">
                            <h3 className="text-lg font-black text-gray-800 uppercase mb-4">Resumo de Categorias</h3>
                            <div className="space-y-3">
                                {activeCategories.map(cat => {
                                    const total = (Object.values(monthlyExecution) as Record<string, number>[]).reduce((acc: number, curr: Record<string, number>) => acc + (curr[cat] || 0), 0);
                                    if (total === 0) return null;
                                    return (
                                        <div key={cat} className="flex justify-between items-center border-b pb-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase">{cat}</span>
                                            <span className="font-mono font-bold text-gray-800">{formatCurrency(total)}</span>
                                        </div>
                                    );
                                })}
                                <div className="flex justify-between items-center pt-4 border-t-2 border-indigo-100">
                                    <span className="text-sm font-black text-indigo-900 uppercase">Total Geral Gasto</span>
                                    <span className="font-mono font-black text-xl text-indigo-700">
                                        {formatCurrency(financialSummary.totalGeralGasto)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm font-black text-indigo-900 uppercase">Total Geral de Cotas</span>
                                    <span className="font-mono font-black text-xl text-indigo-700">
                                        {formatCurrency(financialSummary.totalGeralCotas)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-dashed border-indigo-200">
                                    <span className={`text-sm font-black uppercase ${financialSummary.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {financialSummary.diff > 0 ? 'Cotas Faltantes' : 'Cotas a serem utilizadas'}
                                    </span>
                                    <span className={`font-mono font-black text-xl ${financialSummary.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {formatCurrency(Math.abs(financialSummary.diff))}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-emerald-600">
                            <h3 className="text-lg font-black text-gray-800 uppercase mb-4">Informação de Apoio</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Este painel consolida todos os lançamentos de Notas Fiscais (Entradas) realizados no sistema, categorizando-os automaticamente para debitar da cota mensal planejada no Cálculo Geral.
                            </p>
                            <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <p className="text-xs font-bold text-emerald-700 uppercase">Dica de Gestão</p>
                                <p className="text-[10px] text-emerald-600 mt-1">
                                    Mantenha os lançamentos de NF atualizados para que o saldo mensal reflita a realidade financeira de cada processo. Apenas categorias com Processo SEI ou Definição preenchidos são contabilizadas.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (activeSubTab as string) === 'AUDIT' ? (
                <div className="animate-fade-in space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-xl border-l-8 border-red-600">
                        <div>
                            <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter italic">Auditoria de Integridade</h2>
                            <p className="text-zinc-500 font-medium">Verificação de itens agendados que não constam no planejamento Per Capita.</p>
                        </div>
                        {auditInconsistencies.length > 0 && (
                            <button 
                                onClick={handleFixAllInconsistencies}
                                disabled={isSaving}
                                className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-8 rounded-2xl shadow-lg transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center gap-2"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Corrigir Tudo ({auditInconsistencies.length})
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-[2rem] shadow-xl border border-zinc-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-900 text-white text-[10px] uppercase font-black tracking-widest">
                                <tr>
                                    <th className="p-4 text-left">Tipo de Erro</th>
                                    <th className="p-4 text-left">Descrição da Inconsistência</th>
                                    <th className="p-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {auditInconsistencies.map((issue, idx) => (
                                    <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                                        <td className="p-4">
                                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-200">
                                                {issue.type}
                                            </span>
                                        </td>
                                        <td className="p-4 font-medium text-zinc-700">
                                            {issue.description}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={issue.fix}
                                                className="text-indigo-600 hover:text-indigo-800 font-black uppercase text-[10px] tracking-widest"
                                            >
                                                Corrigir
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {auditInconsistencies.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="bg-emerald-100 p-4 rounded-full">
                                                    <svg className="h-12 w-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <p className="text-zinc-400 font-black uppercase text-xs tracking-widest">Nenhuma inconsistência detectada. Sistema íntegro!</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Gráfico de Entregas */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-zinc-100">
                            <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter mb-6 flex items-center gap-2">
                                <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                Top 10 Itens Entregues (KG)
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deliveryStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#666' }} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                            formatter={(value: number) => [`${value.toLocaleString('pt-BR')} Kg`, 'Total']}
                                        />
                                        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                                            {deliveryStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#10b981'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-zinc-100">
                            <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter mb-6 flex items-center gap-2">
                                <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Valor Acumulado por Item
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deliveryStats.sort((a,b) => b.value - a.value)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#666' }} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                            formatter={(value: number) => [formatCurrency(value), 'Valor']}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                            {deliveryStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#059669' : '#0891b2'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Fornecedores e Itens */}
                    <div className="bg-white rounded-[2rem] shadow-xl border border-zinc-200 overflow-hidden">
                        <div className="p-8 border-b border-zinc-100 bg-zinc-50/50">
                            <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tighter italic">Relação Fornecedor x Itens Contratados</h3>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Visualização rápida de todos os itens registrados por contrato</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-900 text-white text-[10px] uppercase font-black tracking-widest">
                                    <tr>
                                        <th className="p-4 text-left">Fornecedor</th>
                                        <th className="p-4 text-left">Categoria</th>
                                        <th className="p-4 text-left">Itens em Contrato</th>
                                        <th className="p-4 text-right">Valor Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {[...(suppliers || []), ...ppaisAsSuppliers, ...pereciveisAsSuppliers]
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map((s, idx) => {
                                            const items = Object.values(s.contractItems || {}) as any[];
                                            const category = ppaisProducers.some(p => p.cpfCnpj === s.cpf) ? 'PPAIS' : 
                                                             pereciveisSuppliers.some(p => p.cpfCnpj === s.cpf) ? 'PERECÍVEIS' : 'ESTOCÁVEIS';
                                            
                                            return (
                                                <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-zinc-900 uppercase text-xs">{s.name}</span>
                                                            <span className="text-[9px] font-mono text-zinc-400">{s.cpf}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                            category === 'PPAIS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            category === 'PERECÍVEIS' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                            'bg-zinc-100 text-zinc-700 border-zinc-200'
                                                        }`}>
                                                            {category}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {items.length > 0 ? items.map((it, i) => (
                                                                <span key={i} className="bg-white border border-zinc-200 text-zinc-600 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                                                    {it.name}
                                                                </span>
                                                            )) : (
                                                                <span className="text-red-500 text-[9px] font-black uppercase italic">Nenhum item vinculado</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right font-mono font-bold text-zinc-600">
                                                        {formatCurrency(s.initialValue || 0)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    {activeSubTab === 'CALCULO' ? (
                        <>
                            <div className="space-y-8 animate-fade-in">
                                {/* KPIs Principais de Alta Densidade */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-zinc-900 text-white p-8 rounded-3xl shadow-xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            </div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">População Total</p>
                            <h3 className="text-5xl font-black tracking-tighter italic font-mono">{perCapitaDenominator}</h3>
                            <div className="mt-4 flex gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-zinc-500 uppercase font-black">Servidores</span>
                                    <span className="text-sm font-bold">{staffCount}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-zinc-500 uppercase font-black">Custodiados</span>
                                    <span className="text-sm font-bold">{inmateCount}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 relative overflow-hidden group">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Per Capita (KG)</p>
                            <h3 className="text-5xl font-black tracking-tighter italic font-mono text-zinc-900">
                                {totalPerCapitaKg.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                                <span className="text-lg ml-1 text-zinc-400 not-italic">kg</span>
                            </h3>
                            <p className="text-[10px] font-bold text-zinc-400 mt-4 uppercase tracking-widest">Média Diária Projetada</p>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 relative overflow-hidden group">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Per Capita (R$)</p>
                            <h3 className="text-5xl font-black tracking-tighter italic font-mono text-emerald-600">
                                {formatCurrency(totalPerCapitaValue)}
                            </h3>
                            <p className="text-[10px] font-bold text-zinc-400 mt-4 uppercase tracking-widest">Custo Diário / Pessoa</p>
                        </div>

                        <div className="bg-indigo-600 text-white p-8 rounded-3xl shadow-xl border border-indigo-400/20 relative overflow-hidden">
                            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-4">Saldo de Quota</p>
                            <h3 className="text-5xl font-black tracking-tighter italic font-mono">
                                {formatCurrency((Object.values(monthlyQuota) as number[]).reduce((a: number, b: number) => a + b, 0) - (Object.values(monthlyExecution) as Record<string, number>[]).reduce((acc: number, curr: Record<string, number>) => acc + (Object.values(curr) as number[]).reduce((a: number, b: number) => a + b, 0), 0))}
                            </h3>
                            <p className="text-[10px] font-bold text-indigo-200 mt-4 uppercase tracking-widest">Disponível para Empenho</p>
                        </div>
                    </div>

                    {/* Configuração de População e Processos */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-8">
                            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    Efetivo Populacional
                                </h4>
                                <div className="space-y-6">
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Servidores</label>
                                        <input 
                                            type="number" 
                                            value={staffCount} 
                                            onChange={handleStaffCountChange}
                                            className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-5 py-4 font-mono text-xl font-black focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Custodiados</label>
                                        <input 
                                            type="number" 
                                            value={inmateCount} 
                                            onChange={handleInmateCountChange}
                                            className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-5 py-4 font-mono text-xl font-black focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Resumo Financeiro Anual
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Geral Gasto</span>
                                        <span className="font-mono font-bold text-zinc-900">{formatCurrency(financialSummary.totalGeralGasto)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Geral de Cotas</span>
                                        <span className="font-mono font-bold text-zinc-900">{formatCurrency(financialSummary.totalGeralCotas)}</span>
                                    </div>
                                    <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${financialSummary.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {financialSummary.diff > 0 ? 'Cotas Faltantes' : 'Cotas a serem utilizadas'}
                                        </span>
                                        <span className={`font-mono font-black text-lg ${financialSummary.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {formatCurrency(Math.abs(financialSummary.diff))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Processos SEI por Categoria
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {['PPAIS', 'KIT PPL', 'ESTOCÁVEIS', 'PERECÍVEIS', 'AUTOMAÇÃO', 'PRODUTOS DE LIMPEZA'].map(cat => (
                                    <div key={cat} className="flex flex-col gap-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-indigo-200 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{cat}</span>
                                            <span className="text-[9px] font-bold text-zinc-400 italic">SEI / Definição</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Nº Processo"
                                                value={seiProcessNumbers[cat] || ''} 
                                                onChange={(e) => handleSeiNumberChange(cat, e.target.value)}
                                                className="w-1/2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono focus:border-indigo-500 outline-none"
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="Definição"
                                                value={seiProcessDefinitions[cat] || ''} 
                                                onChange={(e) => handleSeiDefinitionChange(cat, e.target.value)}
                                                className="w-1/2 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Quotas Mensais */}
                    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Planejamento de Quotas Mensais
                            </h4>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                                    <span className="text-[9px] font-black text-zinc-400 uppercase">Quota</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
                                    <span className="text-[9px] font-black text-zinc-400 uppercase">Recurso</span>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-50">
                                        <th className="px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Mês de Referência</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Quota Mensal (R$)</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Recurso Disponível (R$)</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Execução Real</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {months.map(m => {
                                        const execution = (Object.values(monthlyExecution[m]) as number[]).reduce((a: number, b: number) => a + b, 0);
                                        const quota = monthlyQuota[m] || 0;
                                        const balance = quota - execution;
                                        return (
                                            <tr key={m} className="hover:bg-zinc-50/50 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <span className="text-sm font-black text-zinc-900 uppercase italic tracking-tighter">{m}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <input 
                                                        type="number" 
                                                        value={monthlyQuota[m] || ''} 
                                                        onChange={(e) => handleMonthlyValueChange('quota', m, e.target.value)}
                                                        className="w-full max-w-[150px] bg-transparent border-b-2 border-transparent focus:border-emerald-500 outline-none font-mono font-bold text-sm text-emerald-600 transition-all"
                                                        placeholder="0,00"
                                                    />
                                                </td>
                                                <td className="px-8 py-5">
                                                    <input 
                                                        type="number" 
                                                        value={monthlyResource[m] || ''} 
                                                        onChange={(e) => handleMonthlyValueChange('resource', m, e.target.value)}
                                                        className="w-full max-w-[150px] bg-transparent border-b-2 border-transparent focus:border-indigo-500 outline-none font-mono font-bold text-sm text-indigo-600 transition-all"
                                                        placeholder="0,00"
                                                    />
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="font-mono font-bold text-sm text-zinc-900">{formatCurrency(execution)}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`font-mono font-bold text-sm ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {formatCurrency(balance)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="text-center py-10 border-t border-zinc-100">
                        <button 
                            onClick={() => setShowComparison(!showComparison)}
                            className="px-10 py-4 bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:bg-zinc-800 active:scale-95 transition-all"
                        >
                            {showComparison ? 'Ocultar Comparativo de Contrato' : 'Exibir Comparativo de Contrato'}
                        </button>
                    </div>
                </div>
                {showComparison && (
                    <div className="mt-8 animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black text-gray-800 text-center uppercase tracking-tighter flex-1">
                            Comparativo Resumido dos Itens Adquiridos no Contrato
                        </h3>
                    </div>
                    <div className="border rounded-lg flex flex-col">
                        <div className="flex flex-wrap gap-2 p-4 bg-gray-50 border-b">
                            <button onClick={() => setComparisonFilter('TODOS')} className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${comparisonFilter === 'TODOS' ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-100'}`}>Todos</button>
                            <button onClick={() => setComparisonFilter('SEM_ENTREGA')} className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${comparisonFilter === 'SEM_ENTREGA' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'}`}>
                                <span className="w-2 h-2 rounded-full bg-current"></span> Sem Entrega (0%)
                            </button>
                            <button onClick={() => setComparisonFilter('ATENCAO')} className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${comparisonFilter === 'ATENCAO' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-50'}`}>
                                <span className="w-2 h-2 rounded-full bg-current"></span> Atenção (&lt; 50%)
                            </button>
                            <button onClick={() => setComparisonFilter('AVANCADO')} className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${comparisonFilter === 'AVANCADO' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}>
                                <span className="w-2 h-2 rounded-full bg-current"></span> Avançado (≥ 70%)
                            </button>
                            <button onClick={() => setComparisonFilter('CONCLUIDO')} className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${comparisonFilter === 'CONCLUIDO' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-green-600 border border-green-200 hover:bg-green-50'}`}>
                                <span className="w-2 h-2 rounded-full bg-current"></span> Concluído (100%)
                            </button>
                            <button onClick={() => setComparisonFilter('COM_EMPENHO')} className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${comparisonFilter === 'COM_EMPENHO' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Com Empenho
                            </button>
                        </div>
                        <div 
                            className="overflow-x-auto custom-scrollbar"
                            onScroll={(e) => {
                                const bottomScroll = document.getElementById('comparison-bottom-scroll');
                                if (bottomScroll) bottomScroll.scrollLeft = e.currentTarget.scrollLeft;
                            }}
                        >
                            <div id="comparison-top-dummy" style={{ height: '1px' }}></div>
                        </div>
                        <div 
                            id="comparison-bottom-scroll"
                            className="overflow-x-auto custom-scrollbar"
                            onScroll={(e) => {
                                const topScroll = e.currentTarget.previousElementSibling;
                                if (topScroll) topScroll.scrollLeft = e.currentTarget.scrollLeft;
                            }}
                        >
                            <table 
                                className="w-full text-sm"
                                ref={(el) => {
                                    if (el) {
                                        const dummy = document.getElementById('comparison-top-dummy');
                                        if (dummy) dummy.style.width = `${el.offsetWidth}px`;
                                    }
                                }}
                            >
                                <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                                    <tr>
                                        <th className="p-3 text-center">#</th>
                                        <th className="p-3 text-left">Item</th>
                                        <th className="p-3 text-center">Qtd. Contratada</th>
                                        <th className="p-3 text-center">Qtd. Recebida</th>
                                        <th className="p-3 text-center">Restam Entregar</th>
                                        <th className="p-3 text-center w-32">Progresso</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredComparison.map((item, index) => {
                                        return (
                                            <tr key={item.name} className="hover:bg-gray-50">
                                                <td className="p-3 text-center font-mono text-gray-500">{index + 1}</td>
                                                <td className="p-3 font-semibold text-gray-800">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span>{item.name}</span>
                                                            {item.empenhos.length > 0 && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                                    Empenho: {item.empenhos.join(', ')}
                                                                </span>
                                                            )}
                                                            {item.status === 'SEM_ENTREGA' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">SEM ENTREGA</span>}
                                                            {item.status === 'ATENCAO' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">ATENÇÃO</span>}
                                                            {item.status === 'AVANCADO' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">AVANÇADO</span>}
                                                            {item.status === 'CONCLUIDO' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">CONCLUÍDO</span>}
                                                        </div>
                                                        {item.suppliers.length > 0 && (
                                                            <span className="text-[10px] font-normal text-gray-400 mt-0.5">
                                                                {item.suppliers.join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center font-mono text-gray-500">{item.contracted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}</td>
                                                <td className="p-3 text-center font-mono text-gray-500">{item.received.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}</td>
                                                <td className="p-3 text-center font-mono font-bold text-blue-600">
                                                    {item.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}
                                                </td>
                                                <td className="p-3 w-32">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${item.status === 'SEM_ENTREGA' ? 'bg-red-500' : item.status === 'ATENCAO' ? 'bg-orange-500' : item.status === 'AVANCADO' ? 'bg-blue-500' : item.status === 'CONCLUIDO' ? 'bg-green-500' : 'bg-blue-400'}`} 
                                                                style={{ width: `${Math.min(100, item.percentage)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-[10px] font-mono font-bold text-gray-500 w-8 text-right">{item.percentage.toFixed(0)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                )}

                {suppliersWithoutEmpenho.length > 0 && (
                        <div className="mt-12 animate-fade-in">
                            <h3 className="text-xl font-black text-red-800 text-center uppercase tracking-tighter mb-6 flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                Empresas que faltam emitir o empenho
                            </h3>
                            <div className="border border-red-100 rounded-lg overflow-hidden shadow-sm">
                                <table className="w-full text-sm">
                                    <thead className="bg-red-50 text-xs uppercase text-red-800">
                                        <tr>
                                            <th className="p-3 text-left">Empresa</th>
                                            <th className="p-3 text-center">CNPJ/CPF</th>
                                            <th className="p-3 text-center">Peso a Empenhar</th>
                                            <th className="p-3 text-center">Valor a Empenhar</th>
                                            <th className="p-3 text-left">Observações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-50 bg-white">
                                        {suppliersWithoutEmpenho.map((supplier, index) => (
                                            <React.Fragment key={supplier.document}>
                                                <tr className="hover:bg-red-50/50 transition-colors">
                                                    <td className="p-3 font-semibold text-gray-800">
                                                        {supplier.name}
                                                        {supplier.items.length > 0 && (
                                                            <div className="mt-2 pl-4 border-l-2 border-red-100 space-y-1">
                                                                {supplier.items.map((item, idx) => (
                                                                    <div key={idx} className="text-[10px] text-gray-500 flex justify-between items-center max-w-sm">
                                                                        <span className="truncate pr-2" title={item.name}>• {item.name}</span>
                                                                        <span className="font-mono text-gray-400 whitespace-nowrap">
                                                                            {item.contracted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit} - {formatCurrency(item.value)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-gray-500 align-top">{supplier.document}</td>
                                                    <td className="p-3 text-center font-mono text-gray-600 align-top">{supplier.totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</td>
                                                    <td className="p-3 text-center font-mono font-bold text-red-600 align-top">{formatCurrency(supplier.totalValue)}</td>
                                                    <td className="p-3 align-top">
                                                        <textarea 
                                                            className="w-full p-2 text-[10px] border border-gray-200 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                                                            rows={2}
                                                            placeholder="Adicionar observação..."
                                                            defaultValue={supplier.observations}
                                                            onBlur={(e) => {
                                                                if (onUpdateSupplierObservations && e.target.value !== supplier.observations) {
                                                                    onUpdateSupplierObservations(supplier.document, e.target.value);
                                                                }
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-red-50 font-bold text-red-900">
                                        <tr>
                                            <td colSpan={2} className="p-3 text-right uppercase text-xs tracking-wider">Total a Empenhar:</td>
                                            <td className="p-3 text-center font-mono">{suppliersWithoutEmpenho.reduce((acc, s) => acc + s.totalWeight, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</td>
                                            <td className="p-3 text-center font-mono">{formatCurrency(suppliersWithoutEmpenho.reduce((acc, s) => acc + s.totalValue, 0))}</td>
                                            <td className="p-3"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                    <div className="space-y-8 animate-fade-in">
                    {/* Cabeçalho de Contexto do Processo */}
                    <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Número do Processo SEI</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <input 
                                        type="text"
                                        value={getSeiValue(seiProcessNumbers, activeSubTab)}
                                        onChange={(e) => handleSeiNumberChange(activeSubTab, e.target.value)}
                                        placeholder="Ex: 00000.000000/0000-00" 
                                        className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl pl-11 pr-5 py-4 font-mono text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Definição do Processo</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </div>
                                    <input 
                                        type="text"
                                        value={getSeiValue(seiProcessDefinitions, activeSubTab)}
                                        onChange={(e) => handleSeiDefinitionChange(activeSubTab, e.target.value)}
                                        placeholder="Ex: Aquisição de gêneros alimentícios..." 
                                        className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl pl-11 pr-5 py-4 font-bold text-sm focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navegação Interna de Alta Densidade (PPAIS / ESTOCÁVEIS / PERECÍVEIS) */}
                    {(activeSubTab === 'PPAIS' || activeSubTab === 'ESTOCÁVEIS' || activeSubTab === 'PERECÍVEIS') && (
                        <div className="flex gap-2 bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200 w-fit">
                            <button 
                                onClick={() => {
                                    if (activeSubTab === 'PPAIS') setPpaisSubTab('ITEMS');
                                    else if (activeSubTab === 'PERECÍVEIS') setPereciveisSubTab('ITEMS');
                                    else setPereciveisSubTab('ITEMS'); // Default for ESTOCÁVEIS
                                }}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    (activeSubTab === 'PPAIS' ? ppaisSubTab === 'ITEMS' : pereciveisSubTab === 'ITEMS')
                                    ? 'bg-white text-zinc-900 shadow-sm' 
                                    : 'text-zinc-500 hover:text-zinc-700'
                                }`}
                            >
                                Itens de Aquisição
                            </button>
                            <button 
                                onClick={() => {
                                    if (activeSubTab === 'PPAIS') setPpaisSubTab('PRODUCERS');
                                    else if (activeSubTab === 'PERECÍVEIS') setPereciveisSubTab('SUPPLIERS');
                                    else setPereciveisSubTab('SUPPLIERS');
                                }}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    (activeSubTab === 'PPAIS' ? ppaisSubTab === 'PRODUCERS' : pereciveisSubTab === 'SUPPLIERS')
                                    ? 'bg-white text-zinc-900 shadow-sm' 
                                    : 'text-zinc-500 hover:text-zinc-700'
                                }`}
                            >
                                {activeSubTab === 'PPAIS' ? 'Cadastro de Produtores' : 'Cadastro de Fornecedores'}
                            </button>
                            <button 
                                onClick={() => {
                                    if (activeSubTab === 'PPAIS') setPpaisSubTab('CONTRACT');
                                    else if (activeSubTab === 'PERECÍVEIS') setPereciveisSubTab('CONTRACT');
                                    else setPereciveisSubTab('CONTRACT');
                                }}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    (activeSubTab === 'PPAIS' ? ppaisSubTab === 'CONTRACT' : pereciveisSubTab === 'CONTRACT')
                                    ? 'bg-white text-zinc-900 shadow-sm' 
                                    : 'text-zinc-500 hover:text-zinc-700'
                                }`}
                            >
                                Contrato
                            </button>
                            {activeSubTab === 'PPAIS' && (
                                <button 
                                    onClick={() => setPpaisSubTab('ATA')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        ppaisSubTab === 'ATA'
                                        ? 'bg-white text-zinc-900 shadow-sm' 
                                        : 'text-zinc-500 hover:text-zinc-700'
                                    }`}
                                >
                                    Ata
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    if (activeSubTab === 'PPAIS') setPpaisSubTab('SCHEDULE');
                                    else if (activeSubTab === 'PERECÍVEIS') setPereciveisSubTab('SCHEDULE');
                                    else setPereciveisSubTab('SCHEDULE');
                                }}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    (activeSubTab === 'PPAIS' ? ppaisSubTab === 'SCHEDULE' : pereciveisSubTab === 'SCHEDULE')
                                    ? 'bg-white text-zinc-900 shadow-sm' 
                                    : 'text-zinc-500 hover:text-zinc-700'
                                }`}
                            >
                                Cronograma
                            </button>
                        </div>
                    )}

                    {/* Área de Conteúdo Modular */}
                    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
                        {activeSubTab === 'PPAIS' && ppaisSubTab === 'PRODUCERS' ? (
                            <AdminPerCapitaSuppliers 
                                suppliers={ppaisProducers}
                                onUpdate={handleUpdateProducers}
                                type="PRODUTOR"
                                colorScheme="emerald"
                            />
                        ) : activeSubTab === 'PERECÍVEIS' && pereciveisSubTab === 'SUPPLIERS' ? (
                            <AdminPerCapitaSuppliers 
                                suppliers={pereciveisSuppliers}
                                onUpdate={handleUpdatePereciveisSuppliers}
                                type="FORNECEDOR"
                                colorScheme="indigo"
                            />
                        ) : activeSubTab === 'ESTOCÁVEIS' && pereciveisSubTab === 'SUPPLIERS' ? (
                            <AdminPerCapitaSuppliers 
                                suppliers={estocaveisSuppliers}
                                onUpdate={handleUpdateEstocaveisSuppliers}
                                type="FORNECEDOR"
                                colorScheme="indigo"
                            />
                        ) : (activeSubTab === 'PPAIS' || activeSubTab === 'PERECÍVEIS' || activeSubTab === 'ESTOCÁVEIS') && (activeSubTab === 'PPAIS' ? ppaisSubTab === 'CONTRACT' : pereciveisSubTab === 'CONTRACT') ? (
                            <div className="p-8 space-y-4">
                                <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter">Selecione o Fornecedor para o Contrato</h3>
                                <select 
                                    className="w-full p-4 bg-white border border-zinc-200 rounded-xl font-bold text-sm"
                                    value={selectedProducer?.id || ''}
                                    onChange={(e) => {
                                        const source = activeSubTab === 'PPAIS' ? ppaisProducers : (activeSubTab === 'PERECÍVEIS' ? pereciveisSuppliers : estocaveisSuppliers);
                                        const selected = source.find(p => p.id === e.target.value);
                                        setSelectedProducer(selected || null);
                                    }}
                                >
                                    <option value="">Selecione...</option>
                                    {(activeSubTab === 'PPAIS' ? ppaisProducers : (activeSubTab === 'PERECÍVEIS' ? pereciveisSuppliers : estocaveisSuppliers)).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                {selectedProducer && (
                                    <AdminContractGenerator 
                                        producer={selectedProducer}
                                        type={activeSubTab === 'PPAIS' ? 'PRODUTOR' : 'FORNECEDOR'}
                                    />
                                )}
                            </div>
                        ) : activeSubTab === 'PPAIS' && ppaisSubTab === 'ATA' ? (
                            <AdminAtaGenerator 
                                producers={ppaisProducers}
                                processNumber={getSeiValue(seiProcessNumbers, 'PPAIS')}
                                processDefinition={getSeiValue(seiProcessDefinitions, 'PPAIS')}
                                items={acquisitionItems.filter(item => item.category === 'PPAIS')}
                            />
                        ) : (activeSubTab === 'PPAIS' || activeSubTab === 'PERECÍVEIS' || activeSubTab === 'ESTOCÁVEIS') && (activeSubTab === 'PPAIS' ? ppaisSubTab === 'SCHEDULE' : pereciveisSubTab === 'SCHEDULE') ? (
                            <div className="p-8 space-y-8">
                                <div className="flex justify-end gap-3">
                                    {activeSubTab === 'PPAIS' && onSyncPPAISToAgenda && (
                                        <button 
                                            onClick={onSyncPPAISToAgenda}
                                            className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-emerald-700 shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            Sincronizar com Agenda
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => {
                                            const element = document.getElementById('delivery-schedule-print');
                                            if (!element) return;
                                            
                                            const scrollPos = window.scrollY;
                                            window.scrollTo(0, 0);

                                            const opt = {
                                                margin: [10, 10, 10, 10] as [number, number, number, number],
                                                filename: `Cronograma_Entrega_${activeSubTab}.pdf`,
                                                image: { type: 'jpeg' as const, quality: 0.98 },
                                                html2canvas: { 
                                                    scale: 2, 
                                                    useCORS: true,
                                                    letterRendering: false,
                                                    scrollY: 0,
                                                    windowWidth: element.clientWidth
                                                },
                                                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
                                                pagebreak: { mode: ['css', 'legacy'] }
                                            };
                                            html2pdf()
                                                .set(opt)
                                                .from(element)
                                                .save()
                                                .then(() => {
                                                    window.scrollTo(0, scrollPos);
                                                });
                                        }}
                                        className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Gerar Cronograma PDF
                                    </button>
                                </div>
                                <div id="delivery-schedule-print" className="bg-white p-8 rounded-[2rem] border border-zinc-100">
                                    <h3 className="text-xl font-black text-zinc-800 uppercase tracking-tighter mb-8 text-center">
                                        Cronograma de Entrega - {activeSubTab}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {months.map(month => {
                                            const currentSuppliers = activeSubTab === 'PPAIS' ? ppaisProducers : (activeSubTab === 'PERECÍVEIS' ? pereciveisSuppliers : estocaveisSuppliers);
                                            const suppliersInMonth = currentSuppliers.filter(s => (s.monthlySchedule?.[month] || []).length > 0);
                                            if (suppliersInMonth.length === 0) return null;

                                            return (
                                                <div key={month} className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                                                    <h4 className="text-sm font-black text-indigo-600 uppercase mb-4 border-b border-indigo-100 pb-2">{month}</h4>
                                                    <div className="space-y-4">
                                                        {[1, 2, 3, 4, 5].map(week => {
                                                            const suppliersInWeek = suppliersInMonth.filter(s => (s.monthlySchedule?.[month] || []).includes(week));
                                                            if (suppliersInWeek.length === 0) return null;

                                                            return (
                                                                <div key={week} className="space-y-1">
                                                                    <div className="text-[10px] font-black text-zinc-400 uppercase">Semana {week}</div>
                                                                    <div className="flex flex-col gap-1">
                                                                        {suppliersInWeek.map(s => (
                                                                            <div key={s.id} className="bg-white px-3 py-2 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 flex justify-between items-center">
                                                                                <span>{s.name}</span>
                                                                                <span className="text-[9px] text-zinc-400 font-mono">{s.cpfCnpj}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                                <AdminAcquisitionItems 
                                category={activeSubTab === 'AUDIT' ? 'PPAIS' : activeSubTab} 
                                items={acquisitionItems} 
                                onUpdate={onUpdateAcquisitionItem} 
                                onDelete={onDeleteAcquisitionItem} 
                                contractItems={
                                    activeSubTab === 'PPAIS' ? contractItemNamesByCategory['PPAIS'] :
                                    activeSubTab === 'PERECÍVEIS' ? contractItemNamesByCategory['PERECÍVEIS'] :
                                    (activeSubTab === 'ESTOCÁVEIS' ? contractItemNamesByCategory['ESTOCÁVEIS'] : contractItemNamesByCategory['OTHERS'])
                                }
                                suppliers={
                                    activeSubTab === 'PPAIS' ? ppaisAsSuppliers : 
                                    activeSubTab === 'PERECÍVEIS' ? pereciveisAsSuppliers : 
                                    (activeSubTab === 'ESTOCÁVEIS' ? estocaveisSuppliers.map(s => ({ ...s, cpf: s.cpfCnpj, allowedWeeks: [], deliveries: [], initialValue: 0, contractItems: s.contractItems || [] } as unknown as Supplier)) : suppliers)
                                }
                                onUpdateContractForItem={
                                    activeSubTab === 'PPAIS' ? handleUpdateContractForPpais : 
                                    activeSubTab === 'PERECÍVEIS' ? handleUpdateContractForPereciveis : 
                                    onUpdateContractForItem
                                }
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )}

        <style>{`
                .input-field { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 1rem; border: 2px solid #F3F4F6; border-radius: 1rem; background-color: #fff; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); } 
                .input-field:focus { border-color: #10B981; background-color: #fff; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.15); }
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default AdminPerCapita;