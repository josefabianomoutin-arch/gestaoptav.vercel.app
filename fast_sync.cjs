
const https = require('https');
const fs = require('fs');
const path = require('path');

const dbUrl = "https://gestao-ppais-default-rtdb.firebaseio.com/.json";
const targetPath = path.join('servidor-interno-estoque-percapita', 'server-data', 'db.json');

console.log("Iniciando download direto do banco de dados (Stream)...");

if (!fs.existsSync(path.dirname(targetPath))) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
}

const file = fs.createWriteStream(targetPath);

https.get(dbUrl, (response) => {
    if (response.statusCode !== 200) {
        console.error(`Erro: Status ${response.statusCode}`);
        process.exit(1);
    }
    response.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log(`Sucesso! Banco de dados salvo em: ${targetPath}`);
        console.log(`Tamanho final: ${(fs.statSync(targetPath).size / (1024 * 1024)).toFixed(2)} MB`);
        process.exit(0);
    });
}).on('error', (err) => {
    fs.unlink(targetPath, () => {});
    console.error("Erro no download:", err.message);
    process.exit(1);
});
