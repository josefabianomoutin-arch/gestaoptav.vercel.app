
import React, { useState, useMemo } from 'react';
import type { PerCapitaSupplier } from '../types';

interface AdminContractGeneratorProps {
    producers: PerCapitaSupplier[];
    type: 'PRODUTOR' | 'FORNECEDOR';
}

const AdminContractGenerator: React.FC<AdminContractGeneratorProps> = ({ producers, type }) => {
    const [selectedProducerId, setSelectedProducerId] = useState<string>('');

    const selectedProducer = useMemo(() => 
        producers.find(p => p.id === selectedProducerId),
    [producers, selectedProducerId]);

    const handlePrint = () => {
        window.print();
    };

    if (producers.length === 0) {
        return (
            <div className="p-12 text-center text-zinc-500 font-bold">
                Nenhum {type.toLowerCase()} cadastrado para gerar contrato.
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-zinc-50 p-6 rounded-2xl border border-zinc-200 print:hidden">
                <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                        Selecione o {type}
                    </label>
                    <select 
                        value={selectedProducerId}
                        onChange={(e) => setSelectedProducerId(e.target.value)}
                        className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none transition-all"
                    >
                        <option value="">Selecione...</option>
                        {producers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <button 
                    onClick={handlePrint}
                    disabled={!selectedProducerId}
                    className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimir Contrato
                </button>
            </div>

            {selectedProducer ? (
                <div className="bg-white border border-zinc-200 rounded-3xl p-12 shadow-sm max-w-4xl mx-auto font-serif text-zinc-800 leading-relaxed print:shadow-none print:border-none print:p-0">
                    <div className="text-center space-y-4 mb-12">
                        <div className="flex justify-center mb-4">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Bras%C3%A3o_do_estado_de_S%C3%A3o_Paulo.svg/1200px-Bras%C3%A3o_do_estado_de_S%C3%A3o_Paulo.svg.png" alt="Brasão SP" className="h-20 w-auto" />
                        </div>
                        <h1 className="text-2xl font-bold uppercase">Contrato</h1>
                        <p className="font-bold">CONTRATO N. <span className="font-bold">{selectedProducer.contractNumber || '_____/2026'}</span></p>
                    </div>

                    <div className="space-y-6 text-justify">
                        <p>
                            Termo de Contrato que entre si celebram o Governo do Estado de São Paulo, 
                            <strong> SECRETARIA DE ADMINISTRAÇÃO PENITENCIÁRIA, POR INTERMÉDIO DA PENITENCIÁRIA DE TAIÚVA</strong>, 
                            PARA A AQUISIÇÃO DE GÊNEROS ALIMENTÍCIOS DA AGRICULTURA FAMILIAR PARA ATENDER O PROGRAMA PAULISTA DA AGRICULTURA DE INTERESSE SOCIAL – PPAIS.
                        </p>

                        <p>
                            Aos oito(8) dias do mês de Abril do ano de 2026, nesta cidade de Taiúva, comparecem de um lado o Estado de São Paulo, Secretaria de Administração Penitenciária, por intermédio da Penitenciária de Taiúva, inscrita no CNPJ sob o n.º 96.291.141/0152-92, neste ato representada pelo Senhor DOUGLAS FERNANDO SEMENZIN GALDINO, brasileiro, Chefe de Departamento, portador da CI/RG nº 32.518574-8-SSP/SP e inscrito no CPF/MF. nº 290.990.228-59, doravante designado simplesmente Contratante, e, de outro lado, 
                            <span className="font-bold"> {selectedProducer.name}</span>, 
                            inscrito/a no CPF nº <span className="font-bold">{selectedProducer.cpfCnpj}</span>, 
                            residente na <span className="font-bold">{selectedProducer.address || '____________________'}</span>, 
                            na cidade de <span className="font-bold">{selectedProducer.city || '____________________'}</span>, 
                            e pelos mesmos foi dito na presença das testemunhas ao final consignadas, que em face da autorização da inexigibilidade da licitação constante no Processo SEI 006.00091368/2026-57, nos termos do artigo 74, inciso IV, c.c. o artigo 79 da Lei Federal nº 14.133/2021, pelo presente instrumento avençam um contrato de aquisição de gêneros alimentícios da Agricultura Familiar para atender o Programa Paulista da Agricultura de Interesse Social – PPAIS, sujeitando-se às normas da Lei Federal nº 14.133/2021, Decreto Estadual nº 68.304/2024 e demais normas regulamentares à espécie, inclusive a Lei Estadual nº 14.591/2011, regulamentada pelo Decreto nº 57.755/2012, alterados pelo Decreto nº 60.055/2014, Decreto nº 62.282/2016, e Decreto nº 68.734/2024, e às seguintes cláusulas e condições que reciprocamente outorgam e aceitam:
                        </p>

                        <div className="space-y-4">
                            <h2 className="font-bold underline uppercase">CLÁUSULA PRIMEIRA – DO OBJETO</h2>
                            <p>Constitui objeto do presente contrato a aquisição de:</p>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-zinc-300 text-xs text-center">
                                    <thead>
                                        <tr className="bg-zinc-50">
                                            <th className="border border-zinc-300 p-2 uppercase">Nome do Agricultor</th>
                                            <th className="border border-zinc-300 p-2 uppercase">CPF</th>
                                            <th className="border border-zinc-300 p-2 uppercase">Item</th>
                                            <th className="border border-zinc-300 p-2 uppercase">Quilograma</th>
                                            <th className="border border-zinc-300 p-2 uppercase">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedProducer.contractItems && selectedProducer.contractItems.length > 0 ? (
                                            selectedProducer.contractItems.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="border border-zinc-300 p-2 uppercase">{selectedProducer.name}</td>
                                                    <td className="border border-zinc-300 p-2">{selectedProducer.cpfCnpj}</td>
                                                    <td className="border border-zinc-300 p-2 uppercase">{item.name}</td>
                                                    <td className="border border-zinc-300 p-2">{item.totalKg.toLocaleString('pt-BR')} {item.unit || 'kg'}</td>
                                                    <td className="border border-zinc-300 p-2">
                                                        {(item.totalKg * item.valuePerKg).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="border border-zinc-300 p-4 text-center italic text-zinc-400">
                                                    Nenhum item vinculado a este produtor.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {selectedProducer.contractItems && selectedProducer.contractItems.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-zinc-50 font-bold">
                                                <td colSpan={4} className="border border-zinc-300 p-2 text-right uppercase">Total</td>
                                                <td className="border border-zinc-300 p-2">
                                                    {selectedProducer.contractItems.reduce((acc, item) => acc + (item.totalKg * item.valuePerKg), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="font-bold underline uppercase">CLÁUSULA SEXTA – DO VALOR DO CONTRATO</h2>
                            <p>
                                Pelo fornecimento dos gêneros alimentícios, constantes do Anexo I, a CONTRATADA receberá o valor total de 
                                <span className="font-bold"> {selectedProducer.contractItems?.reduce((acc, item) => acc + (item.totalKg * item.valuePerKg), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>.
                            </p>
                        </div>

                        <div className="pt-12 text-center">
                            <p>Taiúva, 08 de Abril de 2026.</p>
                            <div className="mt-24 grid grid-cols-2 gap-12">
                                <div className="border-t border-zinc-800 pt-2">
                                    <p className="font-bold uppercase">Contratante</p>
                                    <p className="text-xs">Penitenciária de Taiúva</p>
                                </div>
                                <div className="border-t border-zinc-800 pt-2">
                                    <p className="font-bold uppercase">Contratada</p>
                                    <p className="text-xs">{selectedProducer.name}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center text-zinc-400 italic">
                    Selecione um {type.toLowerCase()} para visualizar o contrato.
                </div>
            )}
        </div>
    );
};

export default AdminContractGenerator;
