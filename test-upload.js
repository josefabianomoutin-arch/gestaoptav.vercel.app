
fetch('https://firebasestorage.googleapis.com/v0/b/gestao-ppais.firebasestorage.app/o?name=test.txt', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: 'hello world'
}).then(r => r.json()).then(console.log).catch(console.error);
