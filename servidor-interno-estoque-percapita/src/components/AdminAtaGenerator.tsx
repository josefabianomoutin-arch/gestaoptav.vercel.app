
import React, { useState, useMemo, useRef } from 'react';
import type { PerCapitaSupplier, AcquisitionItem } from '../types';

interface AdminAtaGeneratorProps {
    producers: PerCapitaSupplier[];
    processNumber: string;
    processDefinition: string;
    items: AcquisitionItem[];
}

const AdminAtaGenerator: React.FC<AdminAtaGeneratorProps> = ({ producers, processNumber, processDefinition, items }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Session specific state
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
    const [openingTime, setOpeningTime] = useState('09:00');
    const [meetingTime, setMeetingTime] = useState('09:30');
    const [proposalsCount, setProposalsCount] = useState(producers.length.toString());
    const [itespRep, setItespRep] = useState('Luiz Olimpio de Souza Janeiro');
    const [occurrences, setOccurrences] = useState('');
    const [period, setPeriod] = useState('Janeiro a Dezembro de 2026');
    const [chamadaPublica, setChamadaPublica] = useState(processDefinition.match(/9\d{4}\/\d{4}/)?.[0] || '');
    const [ineligibleProducerIds, setIneligibleProducerIds] = useState<string[]>([]);

    const eligibleProducers = useMemo(() => 
        producers.filter(p => !ineligibleProducerIds.includes(p.id)),
    [producers, ineligibleProducerIds]);

    const ineligibleProducers = useMemo(() => 
        producers.filter(p => ineligibleProducerIds.includes(p.id)),
    [producers, ineligibleProducerIds]);

    const formattedDate = useMemo(() => {
        if (!sessionDate) return '';
        const [year, month, day] = sessionDate.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const dayNum = date.getDate();
        const monthName = date.toLocaleString('pt-BR', { month: 'long' });
        const yearNum = date.getFullYear();
        
        const daysInWords = [
            'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
            'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
            'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco', 'vinte e seis', 'vinte e sete', 'vinte e oito', 'vinte e nove', 'trinta', 'trinta e um'
        ];

        return `${dayNum} (${daysInWords[dayNum]}) dias do mês de ${monthName} de ${yearNum}`;
    }, [sessionDate]);

    const handlePrint = () => {
        window.print();
    };

    const itemsWithAssignments = useMemo(() => {
        return items.map(item => {
            const assignments = producers.flatMap(p => {
                const contractItems = p.contractItems || {};
                const contractItem = contractItems[item.name] || 
                                   Object.values(contractItems).find((ci: any) => ci.name === item.name);
                
                if (contractItem) {
                    return [{
                        supplierName: p.name,
                        supplierCpf: p.cpfCnpj,
                        totalKg: contractItem.totalKg,
                        valuePerKg: contractItem.valuePerKg,
                        unit: contractItem.unit,
                        isEligible: !ineligibleProducerIds.includes(p.id)
                    }];
                }
                return [];
            });
            return { ...item, assignments };
        });
    }, [items, producers, ineligibleProducerIds]);

    const itemsWithProposals = useMemo(() => {
        return itemsWithAssignments.filter(item => 
            item.assignments.some(a => a.isEligible)
        );
    }, [itemsWithAssignments]);

    const itemsWithoutProposals = useMemo(() => {
        return itemsWithAssignments.filter(item => 
            item.assignments.length === 0 || !item.assignments.some(a => a.isEligible)
        );
    }, [itemsWithAssignments]);

    const toggleProducerIneligibility = (id: string) => {
        setIneligibleProducerIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="p-8 space-y-8 print:p-0 print:space-y-0 text-black">
            {/* Form for Session Details */}
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 space-y-6 print:hidden">
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Dados da Sessão Pública
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Data da Sessão</label>
                        <input 
                            type="date" 
                            value={sessionDate}
                            onChange={(e) => setSessionDate(e.target.value)}
                            className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Horário Abertura Protocolos</label>
                        <input 
                            type="time" 
                            value={openingTime}
                            onChange={(e) => setOpeningTime(e.target.value)}
                            className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Horário Início Reunião</label>
                        <input 
                            type="time" 
                            value={meetingTime}
                            onChange={(e) => setMeetingTime(e.target.value)}
                            className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Chamada Pública nº</label>
                        <input 
                            type="text" 
                            value={chamadaPublica}
                            onChange={(e) => setChamadaPublica(e.target.value)}
                            placeholder="Ex: 90002/2025"
                            className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nº de Propostas Apresentadas</label>
                        <input 
                            type="number" 
                            value={proposalsCount}
                            onChange={(e) => setProposalsCount(e.target.value)}
                            className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Representante ITESP</label>
                        <input 
                            type="text" 
                            value={itespRep}
                            onChange={(e) => setItespRep(e.target.value)}
                            className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Período de Entrega</label>
                        <input 
                            type="text" 
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Ocorrências na Sessão</label>
                    <textarea 
                        value={occurrences}
                        onChange={(e) => setOccurrences(e.target.value)}
                        placeholder="Descreva eventuais ocorrências, desistências ou observações..."
                        className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none transition-all min-h-[100px]"
                    />
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Produtores Inabilitados</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {producers.map(p => (
                            <label key={p.id} className="flex items-center gap-3 p-3 bg-white border-2 border-zinc-100 rounded-xl cursor-pointer hover:border-indigo-200 transition-all">
                                <input 
                                    type="checkbox" 
                                    checked={ineligibleProducerIds.includes(p.id)}
                                    onChange={() => toggleProducerIneligibility(p.id)}
                                    className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-zinc-800">{p.name}</span>
                                    <span className="text-[10px] text-zinc-400 font-mono">{p.cpfCnpj}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button 
                        onClick={handlePrint}
                        className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-lg transition-all active:scale-95 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Gerar Ata em PDF
                    </button>
                </div>
            </div>

            {/* Document Preview */}
            <div 
                ref={containerRef} 
                className="bg-white border border-zinc-200 rounded-3xl p-12 shadow-sm w-full max-w-[800px] mx-auto font-serif text-zinc-800 leading-relaxed print:shadow-none print:border-none print:p-0 print:mx-0 print:w-full contract-container"
                style={{ minHeight: '297mm' }}
            >
                <style>{`
                    .avoid-break {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-bottom: 1rem;
                    }
                    td, th {
                        border: 1px solid #000 !important;
                        padding: 4px 8px !important;
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                        font-size: 10px;
                    }
                    tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .header-text {
                        font-family: sans-serif;
                        font-size: 11px;
                        font-weight: bold;
                    }
                `}</style>

                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b border-zinc-300 pb-4">
                    <div className="header-text space-y-0.5">
                        <p>Secretaria da Administração Penitenciária</p>
                        <p>Penitenciária de Taiúva</p>
                    </div>
                </div>

                <div className="text-center space-y-4 mb-8">
                    <h1 className="text-xl font-bold uppercase underline">ATA SESSÃO PÚBLICA</h1>
                </div>

                <div className="space-y-4 text-sm">
                    <p><strong>Chamada Pública nº</strong> {chamadaPublica || '__________'}</p>
                    <p><strong>Processo SEI nº</strong> {processNumber || '__________'}</p>
                    <p><strong>Objeto:</strong> Aquisição de Gêneros Alimentícios Hortifrutigranjeiros (Ppais), com entrega parcelada, para o período de {period}.</p>

                    <p className="text-justify">
                        Aos {formattedDate}, às {openingTime}h abertura de protocolos no setor de Infraestrutura e às {meetingTime}h, reuniu-se no setor de Finanças da Penitenciária de Taiúva, sito a Rodovia Brigadeiro Faria Lima, SP 326, Km 359,6 Taiúva/SP - Cep 14.720-000, a Comissão de Avaliação e Credenciamento do Agricultor Familiar, composto por Ricardo Samuel Scaramal – Chefe de Seção de Administração, José Fabiano Moutin – Chefe de Seção de Finanças e Suprimentos e o representante do ITESP {itespRep}, os produtores {eligibleProducers.map(p => p.name).join(', ')} para a Sessão da Chamada Pública em epígrafe.
                    </p>

                    <p className="text-justify">
                        Foram apresentadas {proposalsCount} ({proposalsCount}) propostas, recebidas e protocoladas, conforme o edital de Chamada Pública. Aberta a sessão, os envelopes lacrados foram encaminhados e rubricados pela Comissão de Avaliação e Credenciamento do Agricultor Familiar e pelo representante do ITESP. Em seguida, a referida Comissão analisou os documentos de habilitação e a proposta de venda apresentada pelo interessado, com o intuito de verificar a conformidade com os requisitos fixados no edital e na legislação vigente, houve proposta para os itens {itemsWithProposals.map((item, idx) => `${idx + 1 < 10 ? '0' : ''}${idx + 1} - ${item.contractItemName || item.name}`).join('; ')}. Já os itens {itemsWithoutProposals.map(item => item.contractItemName || item.name).join(', ')}, não obtiveram propostas apresentadas.
                    </p>

                    <p className="text-justify">
                        Em seguida, o Agricultor foi credenciado na seguinte conformidade:
                    </p>

                    <div className="avoid-break">
                        <h2 className="font-bold uppercase text-xs mb-2">CREDENCIAMENTO</h2>
                        <table>
                            <thead>
                                <tr className="bg-zinc-100">
                                    <th style={{ width: '10%' }}>ITEM</th>
                                    <th style={{ width: '60%' }}>AGRICULTOR FAMILIAR</th>
                                    <th style={{ width: '30%' }}>CPF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {producers.map((p, idx) => (
                                    <tr key={p.id}>
                                        <td className="text-center">{(idx + 1).toString().padStart(2, '0')}</td>
                                        <td>{p.name}</td>
                                        <td className="text-center">{p.cpfCnpj}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="avoid-break">
                        <p className="text-justify mb-2">O presidente da Comissão divulgou a relação do Agricultor habilitado e inabilitado, conforme segue:</p>
                        <h2 className="font-bold uppercase text-xs mb-2">HABILITADO</h2>
                        <table>
                            <thead>
                                <tr className="bg-zinc-100">
                                    <th style={{ width: '10%' }}>ITEM</th>
                                    <th style={{ width: '60%' }}>AGRICULTOR FAMILIAR</th>
                                    <th style={{ width: '30%' }}>CPF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eligibleProducers.map((p, idx) => (
                                    <tr key={p.id}>
                                        <td className="text-center">{(idx + 1).toString().padStart(2, '0')}</td>
                                        <td>{p.name}</td>
                                        <td className="text-center">{p.cpfCnpj}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="avoid-break">
                        <h2 className="font-bold uppercase text-xs mb-2">INABILITADO</h2>
                        {ineligibleProducers.length > 0 ? (
                            <table>
                                <thead>
                                    <tr className="bg-zinc-100">
                                        <th style={{ width: '10%' }}>ITEM</th>
                                        <th style={{ width: '60%' }}>AGRICULTOR FAMILIAR</th>
                                        <th style={{ width: '30%' }}>CPF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ineligibleProducers.map((p, idx) => (
                                        <tr key={p.id}>
                                            <td className="text-center">{(idx + 1).toString().padStart(2, '0')}</td>
                                            <td>{p.name}</td>
                                            <td className="text-center">{p.cpfCnpj}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-xs italic mb-4">Não houve</p>
                        )}
                    </div>

                    <div className="avoid-break">
                        <table>
                            <thead>
                                <tr className="bg-zinc-100">
                                    <th>Item</th>
                                    <th>Descrição</th>
                                    <th>Qtd Total</th>
                                    <th>Valor Uni.</th>
                                    <th>Uni.</th>
                                    <th>Qtd Produtores</th>
                                    <th>Kg por Produtor</th>
                                    <th>Valor Individual</th>
                                    <th>Valor Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsWithProposals.map((item, idx) => {
                                    const validAssignments = item.assignments.filter(a => a.isEligible);
                                    const totalQty = validAssignments.reduce((acc, a) => acc + a.totalKg, 0);
                                    const unitValue = validAssignments[0]?.valuePerKg || 0;
                                    const numProducers = validAssignments.length;
                                    const qtyPerProducer = numProducers > 0 ? totalQty / numProducers : 0;
                                    const individualValue = qtyPerProducer * unitValue;
                                    const totalValue = totalQty * unitValue;

                                    return (
                                        <tr key={idx}>
                                            <td className="text-center">{(idx + 1).toString().padStart(2, '0')}</td>
                                            <td>{item.contractItemName || item.name}</td>
                                            <td className="text-center">{totalQty.toLocaleString('pt-BR')}</td>
                                            <td className="text-right">{unitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="text-center">{(validAssignments[0]?.unit || 'kg').split('-')[0]}</td>
                                            <td className="text-center">{numProducers}</td>
                                            <td className="text-center">{qtyPerProducer.toLocaleString('pt-BR')}</td>
                                            <td className="text-right">{individualValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                            <td className="text-right">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="font-bold bg-zinc-50">
                                    <td colSpan={8} className="text-right uppercase">Valor Total</td>
                                    <td className="text-right">
                                        {itemsWithProposals.reduce((acc, item) => {
                                            const validAssignments = item.assignments.filter(a => a.isEligible);
                                            const totalQty = validAssignments.reduce((a, b) => a + b.totalKg, 0);
                                            const unitValue = validAssignments[0]?.valuePerKg || 0;
                                            return acc + (totalQty * unitValue);
                                        }, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="avoid-break">
                        <table>
                            <thead>
                                <tr className="bg-zinc-100">
                                    <th style={{ width: '10%' }}>ITEM</th>
                                    <th style={{ width: '40%' }}>AGRICULTOR FAMILIAR</th>
                                    <th style={{ width: '20%' }}>CPF</th>
                                    <th style={{ width: '30%' }}>ITENS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eligibleProducers.map((p, idx) => {
                                    const producerItems = itemsWithProposals.filter(item => 
                                        item.assignments?.some(a => a.supplierCpf === p.cpfCnpj && a.isEligible)
                                    ).map(item => item.contractItemName || item.name).join(', ');

                                    return (
                                        <tr key={p.id}>
                                            <td className="text-center">{(idx + 1).toString().padStart(2, '0')}</td>
                                            <td>{p.name}</td>
                                            <td className="text-center">{p.cpfCnpj}</td>
                                            <td>{producerItems || 'Nenhum'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="avoid-break space-y-2">
                        <h2 className="font-bold uppercase text-xs">OCORRÊNCIAS NA SESSÃO PÚBLICA:</h2>
                        <p className="text-justify">{occurrences || 'Nada mais havendo a tratar elaborou-se a ata que lida e estão em conformidade, foi aprovada e assinada pela Comissão de Avaliação e Credenciamento do Agricultor Familiar, encerrando-se assim a sessão.'}</p>
                    </div>

                    <div className="avoid-break space-y-2">
                        <h2 className="font-bold uppercase text-xs">ENCERRAMENTO</h2>
                        <p className="text-justify">
                            Nada mais havendo a tratar elaborou-se a ata que lida e estão em conformidade, foi aprovada e assinada pela Comissão de Avaliação e Credenciamento do Agricultor Familiar, encerrando-se assim a sessão às {meetingTime.split(':')[0]}h:{meetingTime.split(':')[1]}min.
                            Ás {meetingTime}h, foi aberto o prazo para interposição de recursos; por não haver interposição o presidente às {meetingTime}h encerra a presente sessão pública. Eu, Ricardo Samuel Scaramal, membro e Presidente da Comissão de Avaliação e Credenciamento, redigi esta Ata que vai lida e assinada por todos os presentes.
                        </p>
                    </div>

                    <div className="pt-12 space-y-12 text-center avoid-break">
                        <div className="flex justify-center">
                            <div className="w-2/3 border-t border-zinc-800 pt-2">
                                <p className="font-bold uppercase">Ricardo Samuel Scaramal</p>
                                <p className="text-xs">Presidente da Comissão de Avaliação e Credenciamento</p>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <div className="w-2/3 border-t border-zinc-800 pt-2">
                                <p className="font-bold uppercase">José Fabiano Moutin</p>
                                <p className="text-xs">Membro da Comissão de Avaliação e Credenciamento</p>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <div className="w-2/3 border-t border-zinc-800 pt-2">
                                <p className="font-bold uppercase">Luiz Olimpio de Souza Janeiro</p>
                                <p className="text-xs">Representante ITESP</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 text-right">
                        <p>Taiúva, {new Date(sessionDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-4 border-t border-zinc-300 text-[9px] text-center space-y-1 font-sans">
                    <p className="font-bold">Coordenadoria de Unidades Prisionais da Região Noroeste do Estado Penitenciária de Taiúva</p>
                    <p>Rodovia Brigadeiro Faria Lima, SP 326, Km 359,6 | Taiúva-SP | CEP: 14-720-000 |</p>
                    <p>Fone: (16) 3247-6261 – 6262 - 6263 | E-mail: dg@ptaiuva.sap.sp.gov.br</p>
                </div>
            </div>
        </div>
    );
};

export default AdminAtaGenerator;
