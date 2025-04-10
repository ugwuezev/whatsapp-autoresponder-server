const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
  }),
});

const db = admin.firestore();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.use(bodyParser.urlencoded({ extended: false }));

// Add right after db is initialized
app.get('/firestore-test', async (req, res) => {
  try {
    const snapshot = await db.collection('autoresponders').limit(1).get();
    res.send('✅ Firestore connection successful!');
  } catch (err) {
    console.error('❌ Firestore test failed:', err);
    res.status(500).send('Firestore error: ' + err.message);
  }
});

app.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body?.trim().toLowerCase();
  const from = req.body.From;

  console.log('Incoming message:', incomingMsg, 'From:', from);

  try {
    const snapshot = await db
      .collection('autoresponders')
      .where('keyword', '==', incomingMsg)
      .get();

    if (snapshot.empty) {
      console.log('No autoresponder found for:', incomingMsg);
      return res.send('<Response></Response>'); // No match, no reply
    }

    const doc = snapshot.docs[0];
    const reply = doc.data().response;

    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: from,
      body: reply
    });
    
    console.log('Replied with:', reply);
    res.send('<Response></Response>');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
