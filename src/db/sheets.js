const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const TAB_NAME = process.env.GOOGLE_SHEETS_TAB_NAME || 'Orders';

// Column layout: orderId | itemName | price | postStatus | saleStatus | address | imageUrl | createdAt
const HEADER = ['orderId', 'itemName', 'price', 'postStatus', 'saleStatus', 'address', 'imageUrl', 'createdAt'];

let sheetsClient = null;

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function orderToRow(order) {
  return [
    order.orderId,
    order.itemName,
    order.price,
    order.postStatus,
    order.saleStatus,
    order.address || '',
    order.imageUrl,
    new Date().toISOString(),
  ];
}

async function appendOrderRow(order) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [orderToRow(order)] },
  });
}

// Finds the row for orderId (column A) and rewrites it in place.
// Small spreadsheets only -- fine for a single shop's order volume.
async function updateOrderRow(order) {
  const sheets = await getSheetsClient();
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB_NAME}!A:A`,
  });
  const rows = existing.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === order.orderId);

  if (rowIndex === -1) {
    // Row missing (e.g. sheet was cleared) -- fall back to appending.
    return appendOrderRow(order);
  }

  const sheetRowNumber = rowIndex + 1; // 1-indexed, matches the A:A range we just read
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB_NAME}!A${sheetRowNumber}:H${sheetRowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [orderToRow(order)] },
  });
}

async function ensureHeaderRow() {
  const sheets = await getSheetsClient();
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB_NAME}!A1:H1`,
  });
  if (!existing.data.values || existing.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB_NAME}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADER] },
    });
  }
}

module.exports = { appendOrderRow, updateOrderRow, ensureHeaderRow };
