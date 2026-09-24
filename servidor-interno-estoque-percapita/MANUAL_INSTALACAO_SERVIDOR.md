# 📖 Manual de Instalação e Operação - Servidor Interno Fechado
## Sistema Integrado de Gestão de Estoque / Almoxarifado & Per Capita

Este pacote contém o código-fonte integral e a infraestrutura completa para execução do sistema em um **servidor interno fechado (on-premise, intranet corporativa/institucional sem necessidade de internet)**.

---

## 📌 1. Visão Geral da Arquitetura Fechada
- **Backend Embutido:** Node.js com servidor Express de alta performance.
- **Banco de Dados Local Independente:** Persistência transacional em arquivo JSON (`server-data/db.json`), sem necessidade de Firebase, nuvem ou conexão externa.
- **Armazenamento de Arquivos Local:** Upload de fotos de notas fiscais, termos de recebimento e documentos salvos diretamente no disco rígido do servidor (`./uploads/`).
- **Zero Dependência Externa:** Funciona 100% isolado em redes internas fechadas (sem internet).

---

## 💻 2. Requisitos Mínimos
- **Sistema Operacional:** Windows Server, Windows 10/11, Ubuntu 20.04/22.04/24.04, Debian, CentOS ou qualquer distribuição Linux com suporte a Docker ou Node.js.
- **Node.js:** Versão 18 LTS ou 20 LTS instalada ([https://nodejs.org/](https://nodejs.org/)).
- **Memória RAM:** Mínimo de 1 GB (recomendado 2 GB).
- **Espaço em Disco:** 500 MB para o sistema + espaço para documentos/uploads.

---

## 🚀 3. Instalação Rápida no Windows (1 Clique)
1. Extraia o conteúdo deste arquivo `.ZIP` em uma pasta permanente no servidor (ex: `C:\Sistemas\EstoquePercapita`).
2. Abra a pasta e dê um **duplo clique no arquivo `iniciar_servidor.bat`**.
3. O script irá:
   - Verificar a instalação do Node.js.
   - Baixar e configurar as dependências automaticamente (`npm install`).
   - Gerar os arquivos de produção otimizados (`npm run build`).
   - Iniciar o servidor na porta `3000`.
   - Abrir o navegador automaticamente em `http://localhost:3000`.
4. Mantenha a janela do terminal aberta enquanto o sistema estiver em uso. Para rodar em segundo plano como serviço, utilize o PM2 (ver seção 6).

---

## 🐧 4. Instalação no Servidor Linux / Ubuntu
1. Descompacte o pacote no diretório desejado (ex: `/var/www/estoque-percapita` ou `/opt/estoque-percapita`):
   ```bash
   unzip sistema_estoque_percapita_servidor_interno.zip -d /opt/estoque-percapita
   cd /opt/estoque-percapita
   ```
2. Conceda permissão de execução ao script:
   ```bash
   chmod +x iniciar_servidor.sh
   ```
3. Execute o script de inicialização:
   ```bash
   ./iniciar_servidor.sh
   ```
4. Liberar a porta `3000` no firewall (caso esteja ativo):
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw reload
   ```

---

## 🐳 5. Execução via Docker / Docker Compose
Se o seu servidor utiliza Docker, você pode subir o sistema com apenas um comando:

```bash
# Na pasta do projeto:
docker compose up -d --build
```

O container será criado, compilado e iniciado com reinício automático em caso de falha (`restart: always`). Os dados persistentes ficarão armazenados nas pastas locais `./server-data` e `./uploads`.

---

## 🌐 6. Acesso por Outros Computadores na Rede Interna
Para que os computadores dos setores (Almoxarifado, Cozinha, Nutrição, Diretoria) acessem o sistema:

1. Descubra o IP local do servidor:
   - **No Windows:** Abra o Prompt de Comando e digite `ipconfig` (procure por IPv4, ex: `192.168.1.100`).
   - **No Linux:** Digite `hostname -I` ou `ip a`.
2. Em qualquer computador conectado à mesma rede local, abra o navegador e digite:
   ```
   http://192.168.1.100:3000
   ```
   *(Substitua `192.168.1.100` pelo IP real do seu servidor).*

---

## 🔄 7. Manter Rodando 24 Horas como Serviço (PM2 no Linux/Windows)
Para garantir que o sistema inicie sozinho ao ligar o servidor e reinicie caso ocorra queda de energia:

1. Instale o gerenciador de processos PM2:
   ```bash
   npm install -g pm2
   ```
2. Na pasta do projeto, inicie o sistema com o arquivo de configuração:
   ```bash
   pm2 start ecosystem.config.cjs
   ```
3. Salve a lista de processos para inicialização automática no boot do sistema operacional:
   ```bash
   pm2 save
   pm2 startup
   ```

---

## 💾 8. Rotina de Backup e Restauração
Todos os dados e arquivos do sistema ficam concentrados em apenas **duas pastas**:
1. `server-data/db.json` -> Contém todo o banco de dados (fornecedores, estoque, cardápios, per capita, pesagens, senhas e histórico).
2. `uploads/` -> Contém todas as fotos e documentos anexados.

### Como Fazer Backup:
- **Backup Manual:** Basta copiar a pasta `server-data` e a pasta `uploads` para um pendrive, HD externo ou pasta de rede compartilhada.
- **Backup via Navegador:** Acesse o endpoint `http://[IP-DO-SERVIDOR]:3000/api/backup/export` para baixar instantaneamente o arquivo `.json` completo com todos os dados.

### Como Restaurar:
- Basta substituir o arquivo `server-data/db.json` pelo backup desejado e reiniciar o servidor, ou usar a rota `POST /api/backup/restore`.

---

## 📦 9. Módulos Inclusos e Prontos para Uso

### 📦 Módulo de Almoxarifado / Estoque:
- **Gestão de Fornecedores:** Cadastro com CNPJ/CPF, itens contratados, histórico e contatos.
- **Controle de Estoque em Tempo Real:** Saldo atual, estoque mínimo, alertas de reposição, lotes e validade.
- **Movimentações de Estoque:** Entradas por nota fiscal/entrega, saídas de consumo diário e baixas de estoque.
- **Histórico Completo:** Rastreabilidade por data, item, responsável e fornecedor.
- **Impressão de Etiquetas:** Emissão profissional de etiquetas com código de barras e QR Code para caixas, sacas e fardos.
- **Cronograma e Agenda de Entregas:** Visualização semanal e mensal das entregas previstas por fornecedor.
- **Controle de Validades:** Painel inteligente que classifica lotes em regular, atenção ou crítico (próximo do vencimento).
- **Planilha Excel Integrada:** Exportação e visualização completa em `.xlsx`.

### 🥗 Módulo de Gestão de Per Capita:
- **Configuração de Efetivo:** Controle de número de comensais, alunos ou funcionários por categoria.
- **Fichas Técnicas de Preparo:** Cadastro de ingredientes, per capita bruto e líquido, fator de correção e gramaturas.
- **Cardápio Padrão e Diário:** Integração direta com a dedução diária no estoque.
- **Cálculo Automático de Consumo:** Projeção da quantidade necessária de cada ingrediente a partir do efetivo do dia.
- **Registro de Pesagem:** Monitoramento de marmitas, sobras e desperdício.
- **Indicadores Gerenciais:** Custo diário por refeição e histórico gerencial.

---

*Sistema desenvolvido para funcionamento autônomo, robusto e seguro em servidores locais.*
