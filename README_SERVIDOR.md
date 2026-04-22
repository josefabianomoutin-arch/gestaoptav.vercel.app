# Guia de Implantação - Gestão de Dados P Taiuva

Este guia explica como rodar este sistema em um servidor próprio ou computador local.

## Pré-requisitos
1. Instalador do **Node.js** (versão 18 ou superior).
2. Acesso ao terminal (CMD ou PowerShell).

## Passo a Passo para Instalação

1. **Descompacte o arquivo ZIP** na pasta de sua preferência no servidor.
2. **Abra o Terminal** dentro dessa pasta.
3. **Instale as dependências** executando o comando:
   ```bash
   npm install
   ```
4. **Gere a versão de produção** (isso cria uma pasta `dist` otimizada):
   ```bash
   npm run build
   ```
5. **Coloque no ar**:
   - Você pode usar o comando `npm run preview` para testar.
   - Para uso profissional, aponte o seu servidor Web (Nginx, Apache ou IIS) para a pasta `dist` que foi criada.

## Configuração Offline (Executável)
Para que o sistema se comporte como um executável:
1. Após rodar o sistema pela primeira vez no navegador do servidor, clique no ícone de **Instalar** na barra de endereços.
2. O ícone aparecerá na Área de Trabalho e funcionará mesmo sem internet, salvando os dados no cache local.

---
Desenvolvido para: Gestão P Taiuva 2026
Recurso: Gerenciamento de Dados, Estoque e Infraestrutura.
