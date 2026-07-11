const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n');
env.forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    process.env[key] = val.join('=').replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  }
});
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  }),
});

getFirestore().collection('subscriptions').get().then(snapshot => {
  console.log('Total subscriptions:', snapshot.size);
  snapshot.forEach(doc => {
    console.log(doc.id, 'watchedMods:', doc.data().watchedMods);
  });
  process.exit(0);
}).catch(console.error);
