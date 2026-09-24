# Sistema de Gestão de Per Capita (Independente / Desacoplado)

Este pacote contém o código-fonte completo e desacoplado do **Sistema de Gestão de Per Capita**, pronto para ser instalado e executado de forma independente em seu servidor ou computador local.

## 🚀 Requisitos
- **Node.js** (versão 18 ou superior instalada no servidor).

## 📦 Instruções de Instalação e Execução

1. **Descompacte** esta pasta no servidor de sua escolha.
2. Abra o terminal (CMD, PowerShell ou Bash) na pasta raiz do projeto.
3. Instale as dependências executando:
   ```bash
   npm install
   ```
4. **Modo de Desenvolvimento / Teste:**
   ```bash
   npm run dev
   ```
5. **Geração para Produção e Execução em Servidor (Node / Express):**
   ```bash
   npm run build
   npm start
   ```
   O servidor web embutido (Express) iniciará na porta `3000` (ou na porta configurada via variável de ambiente `PORT`).

## 🗄️ Persistência de Dados
O sistema utiliza Firebase Realtime Database (ou armazenamento local sincronizado). As credenciais do Firebase podem ser configuradas em `src/firebaseConfig.ts`.

---
*Desenvolvido para Gestão de Per Capita e Almoxarifado.*
