# Sistema de Estoque / Almoxarifado, Ordens de Saída e Per Capita - Servidor Linux Fechado

Pacote de execução autônoma para servidores Linux (Ubuntu, Debian, Rocky, RHEL, CentOS) operando em rede fechada (100% offline).

## 🚀 Como Executar no Linux:

1. **Extrair:**
   ```bash
   unzip sistema_estoque_percapita_servidor_interno.zip -d /opt/estoque
   cd /opt/estoque
   ```

2. **Permissões:**
   ```bash
   chmod +x *.sh
   ```

3. **Iniciar Imediatamente:**
   ```bash
   ./iniciar_servidor.sh
   ```

4. **Instalar como Serviço 24/7 (systemd):**
   ```bash
   sudo ./instalar_servico_linux.sh
   ```

Consulte `MANUAL_INSTALACAO_SERVIDOR.md` para instruções completas de firewall, backup e configuração.
