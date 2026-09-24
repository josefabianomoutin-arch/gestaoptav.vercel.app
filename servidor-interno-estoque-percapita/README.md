# Sistema de Estoque / Almoxarifado e Gestão de Per Capita (Servidor Interno)

Código-fonte completo, independente e desacoplado, pronto para rodar em servidor local/intranet sem necessidade de conexão com a internet.

## 🚀 Como Iniciar

### No Windows:
Dê um duplo clique no arquivo:
```cmd
iniciar_servidor.bat
```

### No Linux:
Execute no terminal:
```bash
chmod +x iniciar_servidor.sh
./iniciar_servidor.sh
```

### Com Docker:
```bash
docker compose up -d
```

Acesse no navegador:
- **Local:** `http://localhost:3000`
- **Rede Interna:** `http://[IP-DO-SERVIDOR]:3000`

Consulte o arquivo `MANUAL_INSTALACAO_SERVIDOR.md` para instruções completas de configuração de rede, backup e gerenciamento de serviço (PM2).
