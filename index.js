const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

const db = admin.firestore();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body?.trim().toLowerCase();
  const from = req.body.From;

  try {
    const snapshot = await db
      .collection('autoresponders')
      .where('keyword', '==', incomingMsg)
      .get();

    if (snapshot.empty) {
      return res.send('<Response></Response>'); // No match, no reply
    }

    const doc = snapshot.docs[0];
    const reply = doc.data().response;

    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: from,
      body: reply
    });

    res.send('<Response></Response>');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
