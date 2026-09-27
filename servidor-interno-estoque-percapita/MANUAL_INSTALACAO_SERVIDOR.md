# 🐧 Manual de Instalação e Operação - Servidor Linux Fechado (On-Premise)
## Sistema Integrado de Gestão de Estoque, Almoxarifado, Ordens de Saída & Per Capita

Este pacote foi transformado e otimizado especificamente para rodar de forma nativa e independente em **servidores Linux fechados (Ubuntu Server, Debian, Rocky Linux, RHEL, CentOS, Alpine)**, operando 100% em rede interna/intranet sem necessidade de conexão com a internet.

---

## 📌 1. Visão Geral da Arquitetura Linux
- **Backend Embutido:** Node.js com servidor Express de alta performance nativo POSIX.
- **Frontend Pré-Compilado (`./dist`):** Todos os módulos (Almoxarifado, Ordens de Saída, Frotas, Fornecedores e Per Capita) já estão compilados e prontos para servir. **Não requer ferramentas de build.**
- **Módulos Pré-Instalados (`./node_modules`):** Inclui as bibliotecas de execução necessárias. **Não requer `npm install` nem internet no servidor.**
- **Banco de Dados Local Independente:** Armazenamento em arquivo JSON (`server-data/db.json`), com salvamento atômico seguro e desligamento gracioso (SIGTERM/SIGINT).
- **Serviço do Sistema (systemd):** Configuração pronta para rodar como daemon de sistema Linux 24h por dia, com inicialização automática no boot.

---

## 💻 2. Requisitos Mínimos no Linux
- **Distribuição Linux:** Ubuntu 20.04/22.04/24.04 LTS, Debian 11/12, Rocky Linux 8/9, AlmaLinux, RHEL ou CentOS.
- **Node.js:** Versão 18 ou 20 LTS instalada (`node -v`).
  - No Ubuntu/Debian: `sudo apt update && sudo apt install -y nodejs`
  - No RHEL/Rocky: `sudo dnf install -y nodejs`
- **Memória RAM:** Mínimo de 512 MB (recomendado 1 GB).
- **Espaço em Disco:** 200 MB para o sistema + espaço para notas e uploads.

---

## 🚀 3. Instalação e Execução Imediata no Linux (3 Passos)

### Passo 1: Extrair o pacote no servidor
```bash
sudo mkdir -p /opt/estoque
sudo unzip sistema_estoque_percapita_servidor_interno.zip -d /opt/estoque
cd /opt/estoque
```

### Passo 2: Dar permissão de execução aos scripts
```bash
chmod +x *.sh
```

### Passo 3: Iniciar o servidor
```bash
./iniciar_servidor.sh
```

O servidor iniciará instantaneamente na porta **3000** e exibirá os IPs locais para acesso.

---

## ⚙️ 4. Rodar como Serviço de Sistema no Linux (systemd - 24/7 no Boot)

Para que o sistema continue rodando mesmo após fechar o terminal e inicie automaticamente quando o servidor Linux for reiniciado:

```bash
sudo ./instalar_servico_linux.sh
```

### Comandos de gerenciamento do serviço:
- **Verificar se está rodando:**
  ```bash
  sudo systemctl status sistema-estoque
  ```
- **Acompanhar logs em tempo real:**
  ```bash
  sudo journalctl -u sistema-estoque -f
  ```
- **Reiniciar o sistema:**
  ```bash
  sudo systemctl restart sistema-estoque
  ```
- **Parar o sistema:**
  ```bash
  sudo systemctl stop sistema-estoque
  ```

---

## 🔥 5. Liberação de Firewall no Linux

Para permitir que outros computadores da rede interna acessem o sistema:

### No Ubuntu / Debian (UFW):
```bash
sudo ufw allow 3000/tcp comment "Sistema Estoque e Per Capita"
sudo ufw reload
```

### No Rocky Linux / AlmaLinux / RHEL / CentOS (Firewalld):
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

---

## 💾 6. Backup Automático no Linux (Crontab)

Para gerar uma cópia de segurança diária do banco de dados e arquivos:

1. Teste o script de backup:
   ```bash
   ./backup_linux.sh
   ```
   *(Gera um arquivo compactado `.tar.gz` na pasta `backups/` e descarta arquivos com mais de 30 dias).*

2. Agende no crontab do Linux para rodar toda noite às 23:00:
   ```bash
   crontab -e
   ```
   Adicione a linha:
   ```cron
   0 23 * * * /opt/estoque/backup_linux.sh > /dev/null 2>&1
   ```

---

## 🐳 7. Alternativa via Docker no Linux

Se preferir rodar em contêiner Docker:
```bash
docker compose up -d
docker compose logs -f
```

---

## 🌐 8. Como os Usuários Acessam na Intranet
Qualquer computador conectado à mesma rede local pode abrir o navegador e digitar:
`http://[IP-DO-SERVIDOR-LINUX]:3000`

*(Exemplo: `http://192.168.1.150:3000`)*

---

## 🖥️ 9. Como Abrir Sempre em Tela Cheia / Como Programa (Sem Guias nem Barra de URL)

Para que os operadores utilizem o sistema como um programa desktop nativo (sem abas do Chrome e sem a barra de endereços):

### Método A: Atalho Automático Windows (.bat)
1. Dentro do sistema, clique no botão verde superior **"Abrir como Programa"** e depois em **"Baixar Atalho: Modo Janela de Programa (.bat)"**.
2. Salve o arquivo na Área de Trabalho do Windows.
3. Ao clicar duas vezes, ele abrirá automaticamente o Chrome ou Edge com a flag `--app="http://IP:3000"`, executando em janela limpa de programa, sem nenhuma guia ou URL.

### Método B: Pelo Próprio Navegador (2 Cliques)
* **No Google Chrome:**
  1. Acesse o sistema.
  2. Clique no menu de 3 pontinhos (`⋮`) no canto superior direito.
  3. Vá em **Salvar e compartilhar** > **Criar atalho...**
  4. Marque a opção: **☑ "Abrir como janela"**.
  5. Clique em **Criar**. O Chrome adicionará um ícone na sua Área de Trabalho com o nome e logo do sistema.
* **No Microsoft Edge:**
  1. Acesse o sistema.
  2. Clique no menu de 3 pontinhos (`...`) > **Aplicativos** > **Instalar este site como um aplicativo**.

### Método C: Tela Cheia Instantânea
* Basta pressionar a tecla **F11** no teclado ou clicar no botão **"Tela Cheia (F11)"** no cabeçalho do sistema.
