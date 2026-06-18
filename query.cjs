const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: serviceAccount.projectId,
    clientEmail: serviceAccount.clientEmail,
    privateKey: serviceAccount.privateKey.replace(/\\n/g, '\n')
  }),
  databaseURL: 'https://' + serviceAccount.projectId + '-default-rtdb.firebaseio.com'
});

const db = admin.database();
db.ref('acquisitionItems').once('value').then(snap => {
  const data = snap.val();
  const list = data ? Object.values(data) : [];
  console.log('Firebase Items Count:', list.length);
  const categories = {};
  list.forEach(i => {
    categories[i.category] = (categories[i.category] || 0) + 1;
  });
  console.log('Categories:', categories);
  process.exit(0);
});
