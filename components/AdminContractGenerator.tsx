import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import type { PerCapitaSupplier } from '../types';

interface AdminContractGeneratorProps {
    producer: PerCapitaSupplier;
    type: 'PRODUTOR' | 'FORNECEDOR';
}

const AdminContractGenerator: React.FC<AdminContractGeneratorProps> = ({ producer, type }) => {
    const contractRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!contractRef.current) return;
        const opt = {
            margin: [20, 20, 20, 20] as [number, number, number, number],
            filename: `Contrato_${producer.name.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };
        html2pdf().set(opt).from(contractRef.current).save();
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-end">
                <button 
                    onClick={handlePrint}
                    className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-lg transition-all active:scale-95 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Gerar Contrato PDF
                </button>
            </div>
            <div ref={contractRef} className="bg-white p-12 text-zinc-900 font-serif leading-relaxed" style={{ fontSize: '12pt' }}>
                <div className="text-center font-bold mb-8">
                    <h1 className="text-xl uppercase mb-2">CONTRATO</h1>
                    <p>CONTRATO N. ________/2026</p>
                </div>
                
                <p className="mb-6">
                    Termo de Contrato que entre si celebram o Governo do Estado de São Paulo, <strong>SECRETARIA DE ADMINISTRAÇÃO PENITENCIÁRIA</strong>, POR INTERMÉDIO DA PENITENCIÁRIA DE TAIÚVA, PARA A AQUISIÇÃO DE GÊNEROS ALIMENTÍCIOS DA AGRICULTURA FAMILIAR PARA ATENDER O PROGRAMA PAULISTA DA AGRICULTURA DE INTERESSE SOCIAL – PPAIS (1º Quadrimestre).
                </p>

                <p className="mb-6">
                    Aos {new Date().getDate()} dias do mês de {new Date().toLocaleString('pt-BR', { month: 'long' })} do ano de {new Date().getFullYear()}, nesta cidade de Taiúva, comparecem de um lado o Estado de São Paulo, Secretaria de Administração Penitenciária, por intermédio da Penitenciária de Taiúva, inscrita no CNPJ sob o n.º 96.291.141/0152-92, neste ato representada pelo Senhor DOUGLAS FERNANDO SEMENZIN GALDINO, brasileiro, Chefe de Departamento, portador da CI/RG n.º 32.518574-8-SSP/SP e inscrito no CPF/MF. n.º 290.990.228-59, doravante designado simplesmente Contratante, e, de outro lado, <strong>{producer.name}</strong>, inscrito/a no CPF/CNPJ n.º <strong>{producer.cpfCnpj}</strong>, residente na <strong>{producer.address || '________________________________'}</strong>, na cidade de <strong>{producer.city || '________________'}</strong>, e pelos mesmos foi dito na presença das testemunhas ao final consignadas, que em face da autorização da inexigibilidade da licitação constante no Processo SEI <strong>{producer.processNumber}</strong>, nos termos do artigo 74, inciso IV, c.c. o artigo 79 da Lei Federal n.º 14.133/2021, pelo presente instrumento avençam um contrato de aquisição de gêneros alimentícios da Agricultura Familiar para atender o Programa Paulista da Agricultura de Interesse Social – PPAIS, sujeitando-se às normas da Lei Federal n.º 14.133/2021, Decreto Estadual n.º 68.304/2024 e demais normas regulamentares à espécie...
                </p>

                {/* ... (Resto do conteúdo do contrato pode ser adicionado aqui conforme necessário) ... */}
                
                <div className="mt-12 text-center">
                    <p>Taiúva, {new Date().getDate()} de {new Date().toLocaleString('pt-BR', { month: 'long' })} de {new Date().getFullYear()}.</p>
                    <div className="mt-12 border-t border-zinc-900 w-2/3 mx-auto pt-2">
                        <p className="font-bold">CONTRATANTE</p>
                        <p>DOUGLAS FERNANDO SEMENZIN GALDINO</p>
                    </div>
                    <div className="mt-12 border-t border-zinc-900 w-2/3 mx-auto pt-2">
                        <p className="font-bold">{producer.name}</p>
                        <p>CPF/CNPJ: {producer.cpfCnpj}</p>
                        <p>CONTRATADA</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminContractGenerator;
