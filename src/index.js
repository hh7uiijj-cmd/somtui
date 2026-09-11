require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { config } = require('./lineClient');
const { handleEvent } = require('./eventRouter');
const { ensureHeaderRow } = require('./db/sheets');

const app = express();

// line.middleware validates the signature against the raw body itself,
// so this route must NOT sit behind express.json().
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all((req.body.events || []).map(handleEvent))
    .then(() => res.status(200).end())
    .catch((err) => {
      console.error('Webhook error:', err);
      res.status(500).end();
    });
});

app.get('/', (req, res) => res.send('LINE shipping bot is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await ensureHeaderRow();
  } catch (err) {
    console.warn('Could not verify Google Sheets header row on startup:', err.message);
  }
});
