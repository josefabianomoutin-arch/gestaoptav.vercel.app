const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const isMainSupplier = suppliers\.some\(s => s\.cpf === supplierCpf\);[\s\S]*?return { success: false, message: 'Erro ao gravar no banco de dados.' };\n    \}/;

const replacement = `    // Check Per Capita FIRST
    try {
      const snapshotPC = await get(perCapitaConfigRef);
      const currentData = snapshotPC.val() as PerCapitaConfig;
      if (currentData) {
        let found = false;
        const updateList = async (list: any[] | undefined, listName: string) => {
          if (!list) return false;
          const index = list.findIndex(p => p.cpfCnpj === supplierCpf);
          if (index !== -1) {
            const deliveries = list[index].deliveries || [];
            let updatedAny = false;
            const updatedDeliveries = deliveries.map((d: any) => {
              if (d.invoiceNumber === invoiceNumber) {
                const updated = { ...d };
                if (finalInvoiceUrl !== undefined) updated.invoiceUrl = finalInvoiceUrl;
                updatedAny = true;
                return updated;
              }
              return d;
            });
            if (updatedAny) {
              await update(child(perCapitaConfigRef, \`\${listName}/\${index}\`), { deliveries: updatedDeliveries });
              
              // --- NOVO: Espelhar no warehouseLog ---
              try {
                const qLog = query(warehouseLogRef, orderByChild('supplierCpf'), equalTo(supplierCpf));
                const logSnapshot = await get(qLog);
                const allLogs = logSnapshot.val() || {};
                const updatesLog: Record<string, any> = {};
                let hasUpdatesLog = false;

                Object.entries(allLogs).forEach(([key, entry]: [string, any]) => {
                  if (String(entry.inboundInvoice || entry.outboundInvoice || '') === String(invoiceNumber)) {
                    updatesLog[\`\${key}/invoiceUrl\`] = finalInvoiceUrl;
                    hasUpdatesLog = true;
                  }
                });

                if (hasUpdatesLog) {
                  await update(warehouseLogRef, updatesLog);
                }
              } catch (e) {
                console.error("Error syncing invoice URL to warehouse log:", e);
              }

              found = true;
              return true;
            }
          }
          return false;
        };

        if (await updateList(currentData.ppaisProducers, 'ppaisProducers')) {
        } else if (await updateList(currentData.pereciveisSuppliers, 'pereciveisSuppliers')) {
        } else if (await updateList(currentData.estocaveisSuppliers, 'estocaveisSuppliers')) {
        }

        if (found) {
          return { success: true };
        }
      }
    } catch (e) {
      console.error("Error updating supplier invoice URL in PC:", e);
    }

    const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
    if (isMainSupplier) {
      const supplierRef = child(suppliersRef, supplierCpf);
      try {
        const snapshot = await get(supplierRef);
        const currentData = snapshot.val() as Supplier;
        if (currentData && currentData.deliveries) {
          let updatedAny = false;
          const deliveries = currentData.deliveries.map(d => {
            if (d.invoiceNumber === invoiceNumber) {
              const updated = { ...d };
              if (finalInvoiceUrl !== undefined) updated.invoiceUrl = finalInvoiceUrl;
              updatedAny = true;
              return updated;
            }
            return d;
          });
          
          if (updatedAny) {
             await update(supplierRef, { deliveries });

             // --- NOVO: Espelhar no warehouseLog ---
             try {
               const qLog = query(warehouseLogRef, orderByChild('supplierCpf'), equalTo(supplierCpf));
               const logSnapshot = await get(qLog);
               const allLogs = logSnapshot.val() || {};
               const logUpdates: Record<string, any> = {};
               let hasLogUpdates = false;

               Object.entries(allLogs).forEach(([key, entry]: [string, any]) => {
                 if (String(entry.inboundInvoice || entry.outboundInvoice || '') === String(invoiceNumber)) {
                   logUpdates[\`\${key}/invoiceUrl\`] = finalInvoiceUrl;
                   hasLogUpdates = true;
                 }
               });

               if (hasLogUpdates) {
                 await update(warehouseLogRef, logUpdates);
               }
             } catch (e) {
               console.error("Error syncing invoice URL to warehouse log:", e);
             }

             return { success: true };
          }
        }
        return { success: false, message: 'Dados do fornecedor não encontrados.' };
      } catch (e) {
        console.error("Error updating supplier invoice URL:", e);
        return { success: false, message: 'Erro ao gravar no banco de dados.' };
      }
    }
    
    return { success: false, message: 'Dados do fornecedor não encontrados no sistema.' };`;

if (code.match(regex)) {
   code = code.replace(regex, replacement);
   fs.writeFileSync('src/App.tsx', code);
   console.log('Successfully replaced!');
} else {
   console.log('Regex did not match.');
}
