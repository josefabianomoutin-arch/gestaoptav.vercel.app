
import React from 'react';
import type { PerCapitaSupplier } from '../types';

interface ContractViewProps {
    producer: PerCapitaSupplier;
    activeContractPeriod?: '1_QUAD' | '2_3_QUAD';
    contractDate: string;
}

const ContractView: React.FC<ContractViewProps> = ({ producer, activeContractPeriod = '1_QUAD', contractDate }) => {
    return (
        <div 
            className="bg-white border border-zinc-200 rounded-3xl p-10 shadow-sm w-full max-w-[800px] mx-auto font-serif text-zinc-800 leading-relaxed print:shadow-none print:border-none print:p-0"
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
                }
                td, th {
                    word-break: break-word !important;
                    overflow-wrap: break-word !important;
                }
                tr {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
            `}</style>
            <div className="text-center space-y-1 mb-8 pt-10">
                <h1 className="text-2xl font-bold uppercase">Contrato</h1>
                <p className="font-bold text-base">CONTRATO N. <span className="font-bold">{producer.contractNumber || '_____/2026'}</span></p>
            </div>

            <div className="space-y-0">
                <div className="flex">
                    <div className="w-1/2"></div>
                    <div className="w-1/2 text-sm text-left" style={{ textAlign: 'left' }}>
                        <p>
                            Termo de Contrato que entre si celebram o Governo do Estado de São Paulo, 
                            <strong> SECRETARIA DE ADMINISTRAÇÃO PENITENCIÁRIA, POR INTERMÉDIO DA PENITENCIÁRIA DE TAIÚVA</strong>, 
                            PARA A AQUISIÇÃO DE GÊNEROS ALIMENTÍCIOS DA AGRICULTURA FAMILIAR PARA ATENDER O PROGRAMA PAULISTA DA AGRICULTURA DE INTERESSE SOCIAL – PPAIS ({activeContractPeriod === '1_QUAD' ? '1º Quadrimestre' : '2º e 3º Quadrimestre'}).
                        </p>
                    </div>
                </div>

                <p className="text-justify">
                    {contractDate}, nesta cidade de Taiúva, comparecem de um lado o Estado de São Paulo, Secretaria de Administração Penitenciária, por intermédio da Penitenciária de Taiúva, inscrita no CNPJ sob o n.º 96.291.141/0152-92, neste ato representada pelo Senhor DOUGLAS FERNANDO SEMENZIN GALDINO, brasileiro, Chefe de Departamento, portador da CI/RG nº 32.518574-8-SSP/SP e inscrito no CPF/MF. nº 290.990.228-59, doravante designado simplesmente Contratante, e, de outro lado, 
                    <span className="font-bold"> {producer.name}</span>, 
                    inscrito/a no CPF/CNPJ nº <span className="font-bold">{producer.cpfCnpj}</span>, 
                    residente na <span className="font-bold">{producer.address || '____________________'}</span>, 
                    na cidade de <span className="font-bold">{producer.city || '____________________'}</span>, 
                    {producer.representativeName && producer.representativeCpf && (
                        <>neste ato representado(a) por <span className="font-bold">{producer.representativeName}</span>, portador(a) do CPF nº <span className="font-bold">{producer.representativeCpf}</span>, </>
                    )}
                    e pelos mesmos foi dito na presença das testemunhas ao final consignadas, que em face da autorização da inexigibilidade da licitação constante no Processo SEI {producer.processNumber || '____________________'}, nos termos do artigo 74, inciso IV, c.c. o artigo 79 da Lei Federal nº 14.133/2021, pelo presente instrumento avençam um contrato de aquisição de gêneros alimentícios da Agricultura Familiar para atender o Programa Paulista da Agricultura de Interesse Social – PPAIS, sujeitando-se às normas da Lei Federal nº 14.133/2021, Decreto Estadual nº 68.304/2024 e demais normas regulamentares à espécie, inclusive a Lei Estadual nº 14.591/2011, regulamentada pelo Decreto nº 57.755/2012, alterados pelo Decreto nº 60.055/2014, Decreto nº 62.282/2016, e Decreto nº 68.734/2024, e às seguintes cláusulas e condições que reciprocamente outorgam e aceitam:
                </p>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA PRIMEIRA – DO OBJETO</h2>
                    <p>Constitui objeto do presente contrato a aquisição de:</p>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed border-collapse border border-zinc-300 text-[10px] text-center">
                            <thead>
                                <tr className="bg-zinc-50">
                                    <th className="border border-zinc-300 p-1 uppercase text-[9px]" style={{ width: '20%' }}>NOME DO AGRICULTOR</th>
                                    <th className="border border-zinc-300 p-1 uppercase text-[9px]" style={{ width: '15%' }}>CPF</th>
                                    <th className="border border-zinc-300 p-1 uppercase text-[9px]" style={{ width: '40%' }}>ITEM</th>
                                    <th className="border border-zinc-300 p-1 uppercase text-[9px]" style={{ width: '10%' }}>QUILOGRAMA</th>
                                    <th className="border border-zinc-300 p-1 uppercase text-[9px]" style={{ width: '15%' }}>VALOR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {producer.contractItems && producer.contractItems.length > 0 ? (
                                    producer.contractItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="border border-zinc-300 p-1 uppercase break-words">{producer.name}</td>
                                            <td className="border border-zinc-300 p-1 break-words">{producer.cpfCnpj}</td>
                                            <td className="border border-zinc-300 p-1 uppercase text-[10px] leading-tight break-words" style={{ textAlign: 'left' }}>{item.name}</td>
                                            <td className="border border-zinc-300 p-1 break-words">{item.totalKg.toLocaleString('pt-BR')} {item.unit || 'kg'}</td>
                                            <td className="border border-zinc-300 p-1 break-words">
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
                            {producer.contractItems && producer.contractItems.length > 0 && (
                                <tfoot>
                                    <tr className="bg-zinc-50 font-bold text-[10px]">
                                        <td colSpan={4} className="border border-zinc-300 p-1 text-right uppercase">Total</td>
                                        <td className="border border-zinc-300 p-1">
                                            {producer.contractItems.reduce((acc, item) => acc + (item.totalKg * item.valuePerKg), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                    <p>
                        em conformidade com as Especificações e Quantidades (Anexo I) e Proposta de Venda da CONTRATADA (Anexo II), que integram o presente contrato como se nele estivessem transcritos.
                    </p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA SEGUNDA – PRAZO E LOCAL DE ENTREGA, PERÍODO DE FORNECIMENTO E RECEBIMENTO DO OBJETO</h2>
                    <p>1. O objeto da presente contratação será entregue parceladamente, nos prazos e locais determinados pela CONTRATANTE, conforme cronograma de fornecimento Anexo I do presente contrato;</p>
                    <p>2. A Comissão de recepção de Material, no momento da entrega dos produtos, irá verificar se eles estão em conformidade com as especificações contidas no Edital, tendo o prazo de 24 (vinte e quatro) horas para exigir as devidas substituições ou complementações;</p>
                    <p>3. Serão rejeitados no momento do recebimento os produtos que estiverem em desacordo com as especificações do Edital, e não forem substituídos e/ou complementados na forma e prazo estipulados no subitem 5, do item VII, do Edital de Chamada Pública;</p>
                    <p>4. O recebimento dos gêneros alimentícios será formalizado com o Atestado de Recebimento Definitivo, conforme modelo apresentado no Anexo III.</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA TERCEIRA – DO LIMITE INDIVIDUAL DE VENDA</h2>
                    <p>A CONTRATADA compromete-se a observar o limite individual de venda de gêneros alimentícios do Fornecedor Familiar de até R$ 208.000,00 (duzentos e oito mil reais) por DCONP/ano, sendo aplicável o referido teto de forma individualizada para o Programa PPAIS (R$ 104.000,00) para produtos “in natura” e (R$ 104.000,00) para o subprograma “Leite e Derivados”.</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA QUARTA – DAS OBRIGAÇÕES DA CONTRATADA</h2>
                    <p>1. Atendimento a todas as exigências legais e regulamentares, em especial a da Lei Estadual nº 14.591/2011, o Decreto nº 57.755/2012, alterado pelo Decreto nº 60.055/2014, nº 62.282/2016 e Decreto nº 68.734 de 27 de julho de 2024, bem como as deliberações da Comissão Gestora do PPAIS, principalmente, no que se refere às exigências:</p>
                    <p className="ml-4">
                        a. para expedição da Declaração de Conformidade ao Programa Paulista da Agricultura de Interesse Social - DCONP;<br/>
                        b. de aptidão para participar da Chamada Pública - certificando não ter ultrapassado o limite de R$ 208.000,00 (duzentos e oito mil reais) por DCONP/ano, sendo aplicável o referido teto de forma individualizada para o Programa PPAIS (R$ 104.000,00) para produtos “in natura” e (R$ 104.000,00) para o subprograma “Leite e Derivados”.<br/>
                        c. contidas na proposta de venda do(s) produto(s);
                    </p>
                    <p>2. Fornecer os gêneros alimentícios, conforme descrição completa do produto contida no Anexo I do Edital – Especificações e Quantidades;</p>
                    <p>3. Acondicionar os itens em caixas ou outros tipos de embalagens aceitas pela legislação que garantam a integridade do produto durante o transporte e armazenamento;</p>
                    <p>3.1 No caso de produtos hortícolas apresentados em embalagens com pacotes será admitida uma tolerância no peso de embalagem de 5% a 10%. Entretanto, o quantitativo total da embalagem de acondicionamento dos pacotes deve coincidir com o especificado no documento fiscal no ato da entrega;</p>
                    <p>4. Utilizar o mesmo número de CPF indicado na habilitação em todos os documentos, inclusive na nota fiscal;</p>
                    <p>5. Abster-se de contratar menores de 18 (dezoito) anos para trabalharem em período noturno e em locais perigosos ou insalubres, e de qualquer trabalho a menores de 16 (dezesseis) anos, salvo na condição de aprendiz, a partir de 14 (quatorze) anos, em respeito ao disposto no inciso VI do artigo 68 da Lei Federal nº 14.133/2021, o qual faz referência ao inciso XXXIII do artigo 7º da CF/88.</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA QUINTA – DAS OBRIGAÇÕES DA CONTRANTE</h2>
                    <p>1. Adquirir os gêneros alimentícios nos termos e condições definidos na Chamada Pública;</p>
                    <p>2. Providenciar o pagamento das faturas aprovadas;</p>
                    <p>3. Indicar, formalmente, o funcionário responsável pelo acompanhamento e fiscalização da execução contratual;</p>
                    <p>4. Prestar à CONTRATADA as informações e esclarecimentos necessários que eventualmente venham a ser solicitados, que interfiram na execução do contrato;</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA SEXTA – DO VALOR DO CONTRATO</h2>
                    <p>
                        Pelo fornecimento dos gêneros alimentícios, constantes do Anexo I, a CONTRATADA receberá o valor total de 
                        <span className="font-bold"> {producer.contractItems?.reduce((acc, item) => acc + (item.totalKg * item.valuePerKg), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>.
                    </p>
                    <p>Parágrafo único - No valor contratado estão incluídas as despesas com frete, recursos humanos e materiais, assim como com os encargos fiscais, sociais, comerciais, trabalhistas e previdenciários e quaisquer outras despesas necessárias ao cumprimento das obrigações decorrentes do presente contrato.</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA SÉTIMA – DA DOTAÇÃO ORÇAMENTÁRIA</h2>
                    <p>As despesas decorrentes deste instrumento correrão por conta do orçamento de 2026 nos termos seguintes - Dotação Orçamentária: <strong>14.421.3813.6141.0000</strong> PTRES <strong>380.604</strong>; Fonte de Recurso: <strong>150010001</strong>, UGE <strong>380252</strong>, ND <strong>33.90.30.11</strong> PPAIS</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA OITAVA – DO PAGAMENTO</h2>
                    <p>A CONTRANTE efetuará o pagamento do valor do objeto contratado por meio de crédito aberto em conta corrente do Banco do Brasil em até 30 (trinta) dias após a entrega da nota fiscal/fatura, à vista do respectivo Atestado de Recebimento Definitivo – Anexo III (art. 2º do Decreto nº 32.117, de 10/08/1990, com redação dada pelo Decreto Estadual nº 43.914, de 26/03/1999), observadas e cumpridas pela CONTRATADA as seguintes exigências:</p>
                    <p>1. As notas fiscais/faturas devem ser emitidas, indicando o mês de referência, a quantidade, o valor unitário e o valor total de cada produto.</p>
                    <p>2. O CPF constante da nota fiscal/fatura deverá ser o mesmo indicado na proposta de venda.</p>
                    <p>3. No corpo da nota fiscal/fatura deve constar os dados bancários (banco, agência e conta corrente)</p>
                    <p>§ 1º Não será efetuado qualquer pagamento à CONTRATADA enquanto houver pendência de liquidação da obrigação financeira em virtude de penalidade ou inadimplência contratual.</p>
                    <p>§ 2º Havendo atraso nos pagamentos, sobre a quantia devida incidirá correção nos termos do bem como juros moratórios, à razão de 0,5%(meio por cento) ao mês, calculados “pro rata tempore” em relação ao atraso verificado; salvo em se tratando de atraso nos pagamentos referentes aos primeiros meses do exercício, decorrente de atraso na distribuição do orçamento, no registro de empenhos ou outras questões correlatas, hipóteses em que será facultado ao contratante pagar os valores vencidos assim que regularizada a situation.</p>
                    <p>§ 3º Constitui condição para a realização do pagamento a inexistência de registros em nome da CONTRATADA no Cadastro Informativo dos Créditos não Quitados de Órgãos e Entidades Estaduais do Estado de São Paulo – <strong>CADIN ESTADUAL</strong>, o qual deverá ser consultado por ocasião da realização do pagamento.</p>
                    <p>§ 4º O preço permanecerá fixo e irreajustável.</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA NONA – DO ARQUIVAMENTO DE NOTAS FISCAIS</h2>
                    <p>A CONTRATADA deverá guardar pelo prazo de 5 (cinco) anos, cópias das Notas Fiscais/Faturas, ou congênere, dos produtos constantes do Projeto de Venda de Gêneros Alimentícios da Agricultura Familiar para o Programa Paulista da Agricultura de Interesse Social - PPAIS, estando à disposição para comprovação.</p>
                    <p>A CONTRANTE se compromete a guardar pelo prazo de 5 (cinco) anos as Notas Fiscais/Faturas, apresentados nas prestações de contas, bem como o Projeto de Venda de Gêneros Alimentícios da Agricultura Familiar para o Programa Paulista da Agricultura de Interesse Social - PPAIS e documentos anexos, estando à disposição para comprovação.</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA DÉCIMA – DOS DANOS</h2>
                    <p>É de exclusiva responsabilidade da CONTRATADA o ressarcimento de danos causados à CONTRATANTE ou a terceiros, decorrentes de sua culpa ou dolo na execução do contrato, não excluindo ou reduzindo esta responsabilidade à fiscalização.</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA DÉCIMA PRIMEIRA – DA EXECUÇÃO DO CONTRATO</h2>
                    <p>A CONTRATANTE em razão da supremacia do interesse público sobre os interesses particulares poderá:</p>
                    <p className="ml-4">
                        a. modificar unilateralmente o contrato nos casos permitidos em lei;<br/>
                        b. rescindir unilateralmente o contrato, nos casos de infração contratual ou inaptidão da CONTRATADA;<br/>
                        c. fiscalizar a execução do contrato;<br/>
                        d. aplicar sanções motivadas pela inexecução total ou parcial do ajuste;
                    </p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA DÉCIMA SEGUNDA – DAS PENALIDADES</h2>
                    <p>1. Salvo ocorrência de caso fortuito ou força maior devidamente comprovado, o não cumprimento por parte do Credenciado das obrigações assumidas, sujeitará às sanções administrativas previstas na Lei Federal nº 14.133/2021, e demais normas legais aplicáveis, sem prejuízo da eventual anulação do empenho ou da extinção do instrumento contratual, resguardado direito à ampla defesa.</p>
                    <p>2. As infrações, sanções administrativas e recursos encontram-se previstos nos artigos 155 a 163, e 164 a 166 da Lei Federal nº 14.133/2021.</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA DÉCIMA TERCEIRA – DOS ACRÉSCIMOS E SUPRESSÕES</h2>
                    <p>A Contratada fica obrigada a aceitar, nas mesmas condições contratuais, os acréscimos ou supressões que se fizerem necessárias, até o limite de 25% (vinte e cinco por cento) do valor inicial atualizado do contrato, de acordo com o que preceitua o artigo 125 da Lei Federal nº 14.133/2021, formalizando através de termo de aditamento.</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA DÉCIMA QUARTA - DA EXTINÇÃO DO CONTRATO</h2>
                    <p>O Contrato será extinto, quando constituídos os motivos constantes nos artigos 137 da Lei Federal nº 14.133/2021, sendo que a extinção determinada por ato unilateral da Administração, quando o caso, poderá acarretar as consequências dispostas nos incisos I ao IV do artigo 139 da Lei Federal nº 14.133/2021, sem prejuízo das sanções previstas no artigo 156 do mesmo diploma legal.</p>
                    <p>Nos termos do §2º do artigo 138 da Lei Federal nº 14.133/2021, quando a extinção decorrer de culpa exclusiva da Administração, o contratado será ressarcido pelos prejuízos regularmente comprovados que houver sofrido e terá direito a devolução da garantia (quando exigida); pagamentos devidos pela execução do contrato até a data de extinção; pagamento do custo da desmobilização.</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA DÉCIMA QUINTA – DA VIGÊNCIA</h2>
                    <p>O presente contrato vigorará pelo período de <strong>{activeContractPeriod === '1_QUAD' ? '01/01/2026 a 30/04/2026' : '01/05/2026 a 31/12/2026'}</strong>.</p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA DÉCIMA SEXTA – DISPOSIÇÕES FINAIS</h2>
                    <p>1. O presente Contrato rege-se pela Lei Federal nº 14.133/2021, nos termos do artigo 74, inciso IV, c.c. o artigo 79 do Decreto Estadual nº 68.304/2024, Lei Estadual n.º 14.591, de 14 de outubro de 2011, Decreto Estadual n.º 57.755, de 24 de janeiro de 2012, Decreto Estadual nº 62.282, de 02 de dezembro de 2016, Decreto nº 68.734, de 27 de julho de 2024, e demais diplomas legais regulamentares, que se aplicam, inclusive, em relação aos casos omissos.</p>
                    <p>2. Sem prejuízo das demais obrigações convencionais e legais, a CONTRATADA se obriga a manter, durante toda a execução do contrato, todas as condições de habilitação exigidas na Chamada Pública que deram origem ao presente instrumento.</p>
                    <p>3. Fica ajustado, ainda, que:</p>
                    <p>I - Consideram-se partes integrantes do presente contrato, como se nele estivessem transcritos:</p>
                    <p className="ml-4">
                        a) Edital da Chamada Pública nº <strong>90003/2026</strong>;<br/>
                        b) Proposta apresentada pela Contratada;<br/>
                        c) Anexo I do Edital – Especificações e Quantidades;<br/>
                        d) Anexo I do Termo de Contrato
                    </p>
                </div>

                <div className="space-y-4 text-justify avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h2 className="font-bold underline uppercase">CLÁUSULA SÉTIMA – DO FORO</h2>
                    <p>Fica eleito, desde já, competente o Foro da Comarca da Capital do Estado de São Paulo para dirimir quaisquer questões oriundas ou relativas à aplicação deste contrato não resolvidas na esfera administrativa.</p>
                    <p>E por estarem justas e contratadas, assinam o presente instrumento em 03 (três) vias de igual teor e rubricadas para todos os fins de direito, na presença de duas testemunhas.</p>
                </div>

                <div className="pt-6 pb-6 text-center avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <p>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
                    
                    <div className="mt-12 mb-8 flex justify-center">
                        <div className="w-1/2 border-t border-zinc-800 pt-2 text-center">
                            <p className="font-bold uppercase">Contratante</p>
                            <p className="text-sm">DOUGLAS FERNANDO SEMENZIN GALDINO</p>
                            <p className="text-sm">CPF: 290.990.228-59</p>
                        </div>
                    </div>
                    
                    <div className="mt-12 mb-8 flex justify-center">
                        <div className="w-1/2 border-t border-zinc-800 pt-2 text-center">
                            <p className="font-bold uppercase">{producer.name}</p>
                            <p className="text-sm">CPF/CNPJ: {producer.cpfCnpj}</p>
                            <p className="text-xs uppercase">Contratada</p>
                            {producer.representativeName && (
                                <div className="mt-4">
                                    <p className="text-xs font-bold uppercase">Representante Legal:</p>
                                    <p className="text-sm">{producer.representativeName}</p>
                                    {producer.representativeCpf && (
                                        <p className="text-sm">CPF: {producer.representativeCpf}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 text-left">
                        <p className="font-bold uppercase mb-6">TESTEMUNHAS:</p>
                        
                        <div className="grid grid-cols-2 gap-8">
                            <div className="pt-2">
                                <p className="text-xs font-bold uppercase mt-1">JOSE FABIANO MOUTIN</p>
                                <p className="text-[10px]">RG.: 26.528.522-7-SSP/SP</p>
                                <p className="text-[10px]">CPF: 152.103.618-70</p>
                            </div>

                            <div className="pt-2">
                                <p className="text-xs font-bold uppercase mt-1">RICARDO SAMUEL SCARAMAL</p>
                                <p className="text-[10px]">RG.: 34.637.703-1-SSP/SP</p>
                                <p className="text-[10px]">CPF: 331.900.598-70</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractView;
