import React, { useRef } from 'react';
import type { PerCapitaSupplier } from '../types';

interface AdminContractGeneratorProps {
    producer: PerCapitaSupplier;
}

const AdminContractGenerator: React.FC<AdminContractGeneratorProps> = ({ producer }) => {
    const contractRef = useRef<HTMLDivElement>(null);
    const [manualContractNumber, setManualContractNumber] = React.useState('');

    const totalValue = producer.contractItems?.reduce((acc, item) => acc + (item.totalKg * item.valuePerKg), 0) || 0;
    const isCoopcresp = producer.name.trim().toUpperCase() === 'COOPCRESP';

    const handlePrint = () => {
        window.print();
    };

    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('pt-BR', { month: 'long' });
    const year = today.getFullYear();

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center print:hidden">
                <div className="flex-1 max-w-xs">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Número do Contrato</label>
                    <input 
                        type="text" 
                        value={manualContractNumber}
                        onChange={(e) => setManualContractNumber(e.target.value)}
                        placeholder="Ex: 90003/2.026"
                        className="w-full p-3 bg-white border border-zinc-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
                <button 
                    onClick={handlePrint}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Gerar Contrato PDF
                </button>
            </div>

            <div className="shadow-2xl mx-auto w-fit rounded-xl overflow-hidden print:shadow-none">
                <div ref={contractRef} className="bg-white text-black font-sans leading-relaxed text-[10pt] w-[180mm] contract-container relative">
                    {/* Footer Info - Visible at the end of the document */}
                <div className="mt-8 text-[6pt] text-right leading-tight hidden print:block">
                    <p>Penitenciária de Taiúva</p>
                    <p>Secretaria da Administração Penitenciária</p>
                    <p>Polícia Penal - Penitenciária de Taiúva</p>
                    <p>Rodovia Brigadeiro Faria Lima, SP 326, KM 359,6 Taiúva/SP – CEP: 14.720-000</p>
                </div>
                
                {/* Header Info - Visible on screen only */}
                <div className="text-[8pt] text-right mb-8 print:hidden">
                    <p>Penitenciária de Taiúva</p>
                    <p>Secretaria da Administração Penitenciária</p>
                    <p>Polícia Penal - Penitenciária de Taiúva</p>
                    <p>Rodovia Brigadeiro Faria Lima, SP 326, KM 359,6 Taiúva/SP – CEP: 14.720-000</p>
                </div>

                <div className="text-center font-bold mb-8">
                    <h1 className="text-lg mb-4">CONTRATO</h1>
                    <p className="text-black font-bold">CONTRATO N. {manualContractNumber || '_____'}/{year}</p>
                </div>

                <div className="flex justify-end mb-8">
                    <div className="w-1/2 text-justify font-bold">
                        Termo de Contrato que entre si celebram o Governo do Estado de São Paulo, <span className="text-black font-bold">SECRETARIA DE ADMINISTRAÇÃO PENITENCIÁRIA, POR INTERMÉDIO DA PENITENCIÁRIA DE TAIÚVA</span>, PARA A AQUISIÇÃO DE GÊNEROS ALIMENTÍCIOS DA AGRICULTURA FAMILIAR PARA ATENDER O PROGRAMA PAULISTA DA AGRICULTURA DE INTERESSE SOCIAL – PPAIS.
                    </div>
                </div>

                <p className="text-justify mb-4">
                    Aos <span className="text-black font-bold">{day === 8 ? 'oito(8)' : `${day}(${day})`}</span> dias do mês de <span className="text-black font-bold">{month.charAt(0).toUpperCase() + month.slice(1)}</span> do ano de <span className="text-black font-bold">{year}</span>, nesta cidade de Taiúva, comparecem de um lado o Estado de São Paulo, Secretaria de Administração Penitenciária, por intermédio da Penitenciária de Taiúva, inscrita no CNPJ sob o n.º 96.291.141/0152-92, neste ato representada pelo Senhor <strong>DOUGLAS FERNANDO SEMENZIN GALDINO</strong>, brasileiro, Chefe de Departamento, portador da CI/RG nº 32.518574-8-SSP/SP e inscrito no CPF/MF. nº 290.990.228-59, doravante designado simplesmente Contratante, e, de outro lado, {isCoopcresp ? (
                        <><span className="text-black font-bold">{producer.representativeName || 'NOME DO REPRESENTANTE'}</span> e CPF <span className="text-black font-bold">{producer.representativeCpf || '000.000.000-00'}</span> representando a <span className="text-black font-bold">COOPCRESP</span> (cooperativa), com sede na <span className="text-black font-bold">RESTINGA</span>, inscrito/a no CNPJ/MF ou CPF nº <span className="text-black font-bold">24201681000114</span></>
                    ) : (
                        <><span className="text-black font-bold">{producer.name}</span> (Agricultor Familiar), com sede na <span className="text-black font-bold">{producer.city || 'CIDADE'}</span>, inscrito/a no CNPJ/MF ou CPF nº <span className="text-black font-bold">{producer.cpfCnpj}</span></>
                    )}, e pelos mesmos foi dito na presença das testemunhas ao final consignadas, que em face da autorização da inexigibilidade da licitação constante no Processo SEI <span className="text-black font-bold">{producer.processNumber || '006.00091368/2026-57'}</span>, nos termos do artigo 74, inciso IV, c.c. o artigo 79 da Lei Federal nº 14.133/2021, pelo presente instrumento avençam um contrato de aquisição de gêneros alimentícios da Agricultura Familiar para atender o Programa Paulista da Agricultura de Interesse Social – PPAIS, sujeitando-se às normas da Lei Federal nº 14.133/2021, Decreto Estadual nº 68.304/2024 e demais normas regulamentares à espécie, inclusive a Lei Estadual nº 14.591/2011, regulamentada pelo Decreto nº 57.755/2012, alterados pelo Decreto nº 60.055/2014, Decreto nº 62.282/2016, e Decreto nº 68.734/2024, e às seguintes cláusulas e condições que reciprocamente outorgam e aceitam:
                </p>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA PRIMEIRA – DO OBJETO</h2>
                    <p className="mb-4">Constitui objeto do presente contrato a aquisição de:</p>
                </div>

                <table className="w-full mb-4 text-[3.3pt] table-fixed contract-table border-collapse border border-black">
                    <thead>
                        <tr className="bg-zinc-50 font-bold uppercase text-center">
                            <th className="p-0.5 border border-black w-[15%]">Agricultor</th>
                            <th className="p-0.5 border border-black w-[12%]">CPF</th>
                            <th className="p-0.5 border border-black w-[65%]">Item</th>
                            <th className="p-0.5 border border-black w-[3%]">Qtd</th>
                            <th className="p-0.5 border border-black w-[5%]">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {producer.contractItems?.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-0.5 py-[0.5px] border border-black align-middle text-center">{producer.name}</td>
                                <td className="px-0.5 py-[0.5px] border border-black align-middle text-center">{producer.cpfCnpj}</td>
                                <td className="px-0.5 py-[0.5px] border border-black align-middle text-justify leading-[0.7] font-normal">{item.name}</td>
                                <td className="px-0.5 py-[0.5px] text-center border border-black align-middle whitespace-nowrap">{item.totalKg.toLocaleString('pt-BR')} {item.unit || 'kg'}</td>
                                <td className="px-0.5 py-[0.5px] text-right border border-black align-middle whitespace-nowrap">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalKg * item.valuePerKg)}</td>
                            </tr>
                        ))}
                        <tr className="font-bold">
                            <td colSpan={4} className="px-0.5 py-[0.5px] text-right border border-black uppercase text-[4.5pt]">Valor Total do Contrato</td>
                            <td className="px-0.5 py-[0.5px] text-right border border-black whitespace-nowrap text-[4.5pt]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</td>
                        </tr>
                    </tbody>
                </table>

                <p className="text-justify mb-4">
                    em conformidade com as Especificações e Quantidades (Anexo I) e Proposta de Venda da CONTRATADA (Anexo II), que integram o presente contrato como se nele estivessem transcritos.
                </p>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA SEGUNDA – PRAZO E LOCAL DE ENTREGA, PERÍODO DE FORNECIMENTO E RECEBIMENTO DO OBJETO</h2>
                    <p className="mb-4">1. O objeto da presente contratação será entregue parceladamente, nos prazos e locais determinados pela CONTRATANTE, conforme cronograma de fornecimento Anexo I do presente contrato;</p>
                    <p className="mb-4">2. A Comissão de recepção de Material, no momento da entrega dos produtos, irá verificar se eles estão em conformidade com as especificações contidas no Edital, tendo o prazo de 24 (vinte e quatro) horas para exigir as devidas substituições ou complementações;</p>
                    <p className="mb-4">3. Serão rejeitados no momento do recebimento os produtos que estiverem em desacordo com as especificações do Edital, e não forem substituídos e/ou complementados na forma e prazo estipulados no subitem 5, do item VII, do Edital de Chamada Pública;</p>
                    <p className="mb-4">4. O recebimento dos gêneros alimentícios será formalizado com o Atestado de Recebimento Definitivo, conforme modelo apresentado no Anexo III.</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA TERCEIRA – DO LIMITE INDIVIDUAL DE VENDA</h2>
                    <p className="mb-4">A CONTRATADA compromete-se a observar o limite individual de venda de gêneros alimentícios do Agricultor Familiar de até R$ 208.000,00 (duzentos e oito mil reais) por DCONP/ano, sendo aplicável o referido teto de forma individualizada para o Programa PPAIS (R$ 104.000,00) para produtos “in natura” e (R$ 104.000,00) para o subprograma “Leite e Derivados”.</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA QUARTA – DAS OBRIGAÇÕES DA CONTRATADA</h2>
                    <p className="mb-4">1. Atendimento a todas as exigências legais e regulamentares, em especial a da Lei Estadual nº 14.591/2011, o Decreto nº 57.755/2012, alterado pelo Decreto nº 60.055/2014, nº 62.282/2016 e Decreto nº 68.734 de 27 de julho de 2024, bem como as deliberações da Comissão Gestora do PPAIS, principalmente, no que se refere às exigências:</p>
                    <p className="mb-4 ml-4">a. para expedição da Declaração de Conformidade ao Programa Paulista da Agricultura de Interesse Social - DCONP;</p>
                    <p className="mb-4 ml-4">b. de aptidão para participar da Chamada Pública - certificando não ter ultrapassado o limite de R$ 208.000,00 (duzentos e oito mil reais) por DCONP/ano, sendo aplicável o referido teto de forma individualizada para o Programa PPAIS (R$ 104.000,00) para produtos “in natura” e (R$ 104.000,00) para o subprograma “Leite e Derivados”.</p>
                    <p className="mb-4 ml-4">c. contidas na proposta de venda do(s) produto(s);</p>
                    <p className="mb-4">2. Fornecer os gêneros alimentícios, conforme descrição completa do produto contida no Anexo I do Edital – Especificações e Quantidades;</p>
                    <p className="mb-4">3. Acondicionar os itens em caixas ou outros tipos de embalagens aceitas pela legislação que garantam a integridade do produto durante o transporte e armazenamento;</p>
                    <p className="mb-4">3.1 No caso de produtos hortícolas apresentados em embalagens com pacotes será admitida uma tolerância no peso de embalagem de 5% a 10%. Entretanto, o quantitativo total da embalagem de acondicionamento dos pacotes deve coincidir com o especificado no documento fiscal no ato da entrega;</p>
                    <p className="mb-4">4. Utilizar o mesmo número de CPF indicado na habilitação em todos os documentos, inclusive na nota fiscal;</p>
                    <p className="mb-4 text-justify">5. Abster-se de contratar menores de 18 (dezoito) anos para trabalharem em período noturno e em locais perigosos ou insalubres, e de qualquer trabalho a menores de 16 (dezesseis) anos, salvo na condição de aprendiz, a partir de 14 (quatorze) anos, em respeito ao disposto no inciso VI do artigo 68 da Lei Federal nº 14.133/2021, o qual faz referência ao inciso XXXIII do artigo 7º da CF/88.</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA QUINTA – DAS OBRIGAÇÕES DA CONTRATANTE</h2>
                    <p className="mb-4">1. Adquirir os gêneros alimentícios nos termos e condições definidos na Chamada Pública;</p>
                    <p className="mb-4">2. Providenciar o pagamento das faturas aprovadas;</p>
                    <p className="mb-4">3. Indicar, formalmente, o funcionário responsável pelo acompanhamento e fiscalização da execução contratual;</p>
                    <p className="mb-4">4. Prestar à CONTRATADA as informações e esclarecimentos necessários que eventually venham a ser solicitados, que interfiram na execução do contrato;</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA SEXTA – DO VALOR DO CONTRATO</h2>
                    <p className="mb-4">Pelo fornecimento dos gêneros alimentícios, constantes do Anexo I, a CONTRATADA receberá o <span className="text-black font-bold">valor total de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</span>.</p>
                    <p className="mb-4">Parágrafo único - No valor contratado estão incluídas as despesas com frete, recursos humanos e materiais, assim como com os encargos fiscais, sociais, comerciais, trabalhistas e previdenciários e quaisquer outras despesas necessárias ao cumprimento das obrigações decorrentes do presente contrato.</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA SÉTIMA – DA DOTAÇÃO ORÇAMENTÁRIA</h2>
                    <p className="mb-4">As despesas decorrentes deste instrumento correrão por conta do orçamento de <strong>2026</strong> nos termos seguintes - Dotação Orçamentária: <strong>14.421.3813.6141.0000</strong> PTRES <strong>380.628</strong>; Fonte de Recurso: <strong>150010001</strong>, UGE <strong>380252</strong>, ND <strong>33.90.30.11</strong> PPAIS</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA OITAVA – DO PAGAMENTO</h2>
                    <p className="mb-4 text-justify">A CONTRATANTE efetuará o pagamento do valor do objeto contratado por meio de crédito aberto em conta corrente do Banco do Brasil em até 30 (trinta) dias após a entrega da nota fiscal/fatura, à vista do respectivo Atestado de Recebimento Definitivo – Anexo III (art. 2º do Decreto nº 32.117, de 10/08/1990, com redação dada pelo Decreto Estadual nº 43.914, de 26/03/1999), observadas e cumpridas pela CONTRATADA as seguintes exigências:</p>
                    <p className="mb-4 ml-4">1. As notas fiscais/faturas devem ser emitidas, indicando o mês de referência, a quantidade, o valor unitário e o valor total de cada produto.</p>
                    <p className="mb-4 ml-4">2. O CPF constante da nota fiscal/fatura deverá ser o mesmo indicado na proposta de venda.</p>
                    <p className="mb-4 ml-4">3. No corpo da nota fiscal/fatura deve constar os dados bancários (banco, agência e conta corrente)</p>
                    <p className="mb-4">§ 1º Não será efetuado qualquer pagamento à CONTRATADA enquanto houver pendência de liquidação da obrigação financeira em virtude de penalidade ou inadimplência contratual.</p>
                    <p className="mb-4 text-justify">§2º Havendo atraso nos pagamentos, sobre a quantia devida incidirá correção nos termos do bem como juros moratórios, à razão de 0,5%(meio por cento) ao mês, calculados “pro rata tempore” em relação ao atraso verificado; salvo em se tratando de atraso nos pagamentos referentes aos primeiros meses do exercício, decorrente de atraso na distribuição do orçamento, no registro de empenhos ou outras questões correlatas, hipóteses em que será facultado ao contratante pagar os valores vencidos assim que regularizada a situação.</p>
                    <p className="mb-4 text-justify">§3º Constitui condição para a realização do pagamento a inexistência de registros em nome da CONTRATADA no Cadastro Informativo dos Créditos não Quitados de Órgãos e Entidades Estaduais do Estado de São Paulo – <strong>CADIN ESTADUAL</strong>, o qual deverá ser consultado por ocasião da realização do pagamento.</p>
                    <p className="mb-4">§4º O preço permanecerá fixo e irreajustável.</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA NONA – DO ARQUIVAMENTO DE NOTAS FISCAIS</h2>
                    <p className="mb-4 text-justify">A CONTRATADA deverá guardar pelo prazo de 5 (cinco) anos, cópias das Notas Fiscais/Faturas, ou congênere, dos produtos constantes do Projeto de Venda de Gêneros Alimentícios da Agricultura Familiar para o Programa Paulista da Agricultura de Interesse Social - PPAIS, estando à disposição para comprovação.</p>
                    <p className="mb-4 text-justify">A CONTRANTE se compromete a guardar pelo prazo de 5 (cinco) anos as Notas Fiscais/Faturas, apresentados nas prestações de contas, bem como o Projeto de Venda de Gêneros Alimentícios da Agricultura Familiar para o Programa Paulista da Agricultura de Interesse Social - PPAIS e documentos anexos, estando à disposição para comprovação.</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA DÉCIMA – DOS DANOS</h2>
                    <p className="mb-4 text-justify">É de exclusiva responsabilidade da CONTRATADA o ressarcimento de danos causados à CONTRATANTE ou a terceiros, decorrentes de sua culpa ou dolo na execução do contrato, não excluindo ou reduzindo esta responsabilidade à fiscalização.</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA DÉCIMA PRIMEIRA – DA EXECUÇÃO DO CONTRATO</h2>
                    <p className="mb-4">A CONTRATANTE em razão da supremacia do interesse público sobre os interesses particulares poderá:</p>
                    <p className="mb-4 ml-4">a. modificar unilateralmente o contrato nos casos permitidos em lei;</p>
                    <p className="mb-4 ml-4">b. rescindir unilateralmente o contrato, nos casos de infração contratual ou inaptidão da CONTRATADA;</p>
                    <p className="mb-4 ml-4">c. fiscalizar a execução do contrato;</p>
                    <p className="mb-4 ml-4">d. aplicar sanções motivadas pela inexecução total ou parcial do ajuste;</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA DÉCIMA SEGUNDA – DAS PENALIDADES</h2>
                    <p className="mb-4 text-justify">1. Salvo ocorrência de caso fortuito ou força maior devidamente comprovado, o não cumprimento por parte do Credenciado das obrigações assumidas, sujeitará às sanções administrativas previstas na Lei Federal nº 14.133/2021, e demais normas legais aplicáveis, sem prejuízo da eventual anulação do empenho ou da extinção do instrumento contratual, resguardado direito à ampla defesa.</p>
                    <p className="mb-4">2. As infrações, sanções administrativas e recursos encontram-se previstos nos artigos 155 a 163, e 164 a 166 da Lei Federal nº 14.133/2021.</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA DÉCIMA TERCEIRA – DOS ACRÉSCIMOS E SUPRESSÕES</h2>
                    <p className="mb-4 text-justify">A Contratada fica obrigada a aceitar, nas mesmas condições contratuais, os acréscimos ou supressões que se fizerem necessárias, até o limite de 25% (vinte e cinco por cento) do valor inicial atualizado do contrato, de acordo com o que preceitua o artigo 125 da Lei Federal nº 14.133/2021, formalizando através de termo de aditamento.</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA DÉCIMA QUARTA - DA EXTINÇÃO DO CONTRATO</h2>
                    <p className="mb-4 text-justify">O Contrato será extinto, quando constituídos os motivos constantes nos artigos 137 da Lei Federal nº 14.133/2021, sendo que a extinção determinada por ato unilateral da Administração, quando o caso, poderá acarretar as consequências dispostas nos incisos I ao IV do artigo 139 da Lei Federal nº 14.133/2021, sem prejuízo das sanções previstas no artigo 156 do mesmo diploma legal.</p>
                    <p className="mb-4 text-justify">Nos termos do §2º do artigo 138 da Lei Federal nº 14.133/2021, quando a extinção decorrer de culpa exclusiva da Administração, o contratado será ressarcido pelos prejuízos regularmente comprovados que houver sofrido e terá direito a devolução da garantia (quando exigida); pagamentos devidos pela execução do contrato até a data de extinção; pagamento do custo da desmobilização.</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA DÉCIMA QUINTA – DA VIGÊNCIA</h2>
                    <p className="mb-4">O presente contrato vigorará pelo período de <span className="text-black font-bold">01/05/2026 a 31/12/2026</span>.</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA DÉCIMA SEXTA – DISPOSIÇÕES FINAIS</h2>
                    <p className="mb-4 text-justify">1. O presente Contrato rege-se pela Lei Federal nº 14.133/2021, nos termos do artigo 74, inciso IV, c.c. o artigo 79 do Decreto Estadual nº 68.304/2024, Lei Estadual n.º 14.591, de 14 de outubro de 2011, Decreto Estadual n.º 57.755, de 24 de janeiro de 2012, Decreto Estadual nº 62.282, de 02 de dezembro de 2016, Decreto nº 68.734, de 27 de julho de 2024, e demais diplomas legais regulamentares, que se aplicam, inclusive, em relação aos casos omissos.</p>
                    <p className="mb-4 text-justify">2. Sem prejuízo das demais obrigações convencionais e legais, a CONTRATADA se obriga a manter, durante toda a execução do contrato, todas as condições de habilitação exigidas na Chamada Pública que deram origem ao presente instrumento.</p>
                    <p className="mb-4">3. Fica ajustado, ainda, que:</p>
                    <p className="mb-4 ml-4">I - Consideram-se partes integrantes do presente contrato, como se nele estivessem transcritos:</p>
                    <p className="mb-4 ml-8">a) Edital da Chamada Pública nº <strong>90003/2026</strong>;</p>
                    <p className="mb-4 ml-8">b) Proposta apresentada pela Contratada;</p>
                    <p className="mb-4 ml-8">c) Anexo I do Edital – Especificações e Quantidades;</p>
                    <p className="mb-4 ml-8">d) Anexo I do Termo de Contrato</p>
                </div>

                <div className="contract-section">
                    <h2 className="font-bold underline mb-4 contract-section-header">CLÁUSULA DÉCIMA SÉTIMA – DO FORO</h2>
                    <p className="mb-4 text-justify">Fica eleito, desde já, competente o Foro da Comarca da Capital do Estado de São Paulo para dirimir quaisquer questões oriundas ou relativas à aplicação deste contrato não resolvidas na esfera administrativa.</p>
                    <p className="mb-4 text-justify">E por estarem justas e contratadas, assinam o presente instrumento em 03 (três) vias de igual teor e rubricadas para todos os fins de direito, na presença de duas testemunhas.</p>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-black font-bold">Taiúva, {day} de {month} de {year}.</p>
                    
                    <div className="mt-16 flex flex-col items-center signature-block">
                        <div className="w-2/3 border-t border-black pt-2">
                            <p className="font-bold uppercase">CONTRATANTE</p>
                            <p className="font-bold">DOUGLAS FERNANDO SEMENZIN GALDINO</p>
                            <p>CHEFE DE DEPARTAMENTO</p>
                            <p>RG.:32.518.574-8-SSP/SP</p>
                            <p>CPF: 290.990.228-59</p>
                        </div>
                    </div>

                    <div className="mt-16 flex flex-col items-center signature-block">
                        <div className="w-2/3 border-t border-black pt-2">
                          {isCoopcresp ? (
                            <>
                              <p className="font-bold uppercase text-black">COOPCRESP - {producer.representativeName || 'NOME DO REPRESENTANTE'}</p>
                              <p>CPF: {producer.representativeCpf || '000.000.000-00'}</p>
                              <p className="text-black font-bold">Contratada: assinatura do representante legal</p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold uppercase text-black">{producer.name}</p>
                              <p>CPF/CNPJ: {producer.cpfCnpj}</p>
                              <p className="text-black font-bold">Contratada: assinatura do representante legal</p>
                            </>
                          )}
                        </div>
                    </div>
                </div>

                <div className="mt-16">
                    <p className="font-bold mb-8">TESTEMUNHAS:</p>
                    <div className="flex justify-between gap-8">
                        <div className="w-1/2 border-t border-black pt-2 signature-block">
                            <p className="font-bold">JOSE FABIANO MOUTIN</p>
                            <p>RG.: 26.528.522-7-SSP/SP</p>
                            <p>CPF: 152.103.618-70</p>
                        </div>
                        <div className="w-1/2 border-t border-black pt-2 signature-block">
                            <p className="font-bold">RICARDO SAMUEL SCARAMAL</p>
                            <p>RG.: 34.637.703-1-SSP/SP</p>
                            <p>CPF: 331.900.598-70</p>
                        </div>
                    </div>
                </div>

                {/* ANEXO V */}
                <div className="page-break-before mt-16 pt-16 border-t-2 border-dashed border-zinc-200">
                    <div className="text-center font-bold mb-8">
                        <h2 className="text-lg">ANEXO V</h2>
                    </div>
                    <p className="font-bold mb-4">DECLARAÇÃO DE ATENDIMENTO:</p>
                    <p className="mb-4">- ÀS NORMAS RELATIVAS À SAÚDE E SEGURANÇA DO TRABALHO</p>
                    <p className="mb-4">- A NÃO EXISTÊNCIA DE TRABALHADORES MENORES</p>
                    <p className="mb-4 text-justify">- A CIÊNCIA DE QUE SERÁ OBSERVADO O LIMITE DE VENDA POR DCONP/ANO</p>

                    <p className="text-justify mb-8">
                        {isCoopcresp ? (
                            <>Eu <span className="text-black font-bold">({producer.representativeName || 'NOME DO REPRESENTANTE'})</span>, CPF <span className="text-black font-bold">({producer.representativeCpf || '000.000.000-00'})</span> representando a cooperativa <span className="text-black font-bold">COOPCRESP</span>, portador do CNPJ <span className="text-black font-bold">24201681000114</span>, interessado em participar de Chamadas Públicas DURANTE O EXERCÍCIO DE 2026, DECLARO que atendo às normas relativas à saúde e segurança do trabalho, em virtude das disposições do parágrafo único do artigo 117, da Constituição do Estado de São Paulo.</>
                        ) : (
                            <>Eu <span className="text-black font-bold">({producer.name})</span>, portador do CPF <span className="text-black font-bold">{producer.cpfCnpj}</span>, interessado em participar de Chamadas Públicas DURANTE O EXERCÍCIO DE 2026, DECLARO que atendo às normas relativas à saúde e segurança do trabalho, em virtude das disposições do parágrafo único do artigo 117, da Constituição do Estado de São Paulo.</>
                        )}
                    </p>

                    <p className="text-justify mb-8">
                        Ademais, declaro para fins do disposto no inciso VI do artigo 68 da Lei Federal nº 14.133/2021, o qual faz referência ao inciso XXXIII do artigo 7º da CF/88, que não emprego menor de 18 (dezoito) anos em trabalho node turno, perigoso ou insalubre, e qualquer trabalho a menores de 16 (dezesseis) anos.
                    </p>

                    <p className="text-justify mb-8">
                        Outrossim, DECLARO estar ciente que será observado o limite individual de venda de gêneros alimentícios dos Agricultores Familiares, no valor de R$ 208.000,00 (duzentos e oito mil reais) por DCONP/ Ano Civil referente à produção, sendo aplicável o referido teto de forma individualizada para o Programa PPAIS (R$ 104.000,00) e para o subprograma ‘Leites e Derivados’ (R$ 104.000,00), considerando os dispositivos da Lei Estadual nº 14.591 de 14 de outubro de 2011, do Decreto nº 57.755/2012, alterado pelo Decreto nº 68.734 de 27 de julho de 2024, que regem o Programa Paulista da Agricultura de Interesse Social – PPAIS e PPAIS LEITE, e demais documentos normativos, no que couber.
                    </p>

                    <div className="mt-12 text-center">
                        <p className="text-black font-bold">Taiúva, {day} de {month} de {year}.</p>
                        <div className="mt-16 flex flex-col items-center signature-block">
                            <div className="w-2/3 border-t border-black pt-2">
                                <p className="text-black font-bold">Assinatura – nome/RG</p>
                                {isCoopcresp ? (
                                    <>
                                        <p className="text-black uppercase font-bold">COOPCRESP - {producer.representativeName || 'NOME DO REPRESENTANTE'}</p>
                                        <p className="text-black font-bold">CPF: {producer.representativeCpf || '000.000.000-00'}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-black uppercase font-bold">{producer.name}</p>
                                        <p className="text-black font-bold">NOME/RG/ASSINATURA</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{ __html: `
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact;
                    }
                    @media print {
                        .page-break-before { page-break-before: always; break-before: page; }
                    }
                    /* Ensure red text is black and bold in PDF */
                    .contract-container .text-red-600,
                    .contract-container .text-black.font-bold {
                        color: black !important;
                        font-weight: bold !important;
                    }
                    .signature-block, h2, thead, tfoot, tr, p, .contract-section-header {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    h2 {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                    .contract-section {
                        page-break-inside: auto;
                        break-inside: auto;
                        margin-bottom: 20px;
                        display: block;
                        width: 100%;
                    }
                    p {
                        page-break-inside: auto;
                        orphans: 3;
                        widows: 3;
                        margin-bottom: 1em;
                        text-align: justify;
                        word-wrap: break-word;
                    }
                    table.contract-table {
                        page-break-inside: auto;
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-bottom: 1rem;
                        table-layout: fixed !important;
                    }
                    .contract-table tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .contract-table td, .contract-table th {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        padding: 3px !important;
                        border: 1px solid black !important;
                        vertical-align: middle;
                    }
                    .contract-container {
                        width: 180mm !important;
                        margin: 0 auto !important;
                        background: white !important;
                        padding: 10mm 15mm !important;
                        min-height: auto;
                        overflow: visible !important;
                        box-shadow: none !important;
                        position: relative !important;
                    }
                    h2 + p {
                        page-break-before: avoid !important;
                        break-before: avoid !important;
                    }
                    .whitespace-nowrap {
                        white-space: nowrap !important;
                    }
                `}} />
                </div>
            </div>
        </div>
    );
};

export default AdminContractGenerator;
