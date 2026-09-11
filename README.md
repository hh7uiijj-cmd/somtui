# LINE shipping/order assistant bot

Flow: admin sends a photo → bot asks for name + price → order sits in a
Firestore queue → admin works through "รายการที่ต้องทำ" one card at a time
(post it, mark it sold with an address, mark it shipped) → shipped orders
drop out of the active queue. Every write also mirrors to a Google Sheet.

## 1. Install dependencies
```bash
npm install
```

## 2. Set up LINE
1. Create a Messaging API channel in the [LINE Developers Console](https://developers.line.biz/console/).
2. Copy the **Channel access token** and **Channel secret** into `.env`.
3. Later (step 5) you'll paste your deployed URL + `/webhook` into
   **Messaging API > Webhook URL**, then turn "Use webhook" on.

## 3. Set up Firebase (Firestore + Storage)
1. Create a Firebase project (or reuse an existing one — this can live
   alongside CourseHub/ดวงใจ's Firebase project as a separate collection).
2. Enable **Firestore** and **Storage**.
3. Project settings > Service accounts > Generate new private key. Paste the
   whole JSON file as a single line into `FIREBASE_SERVICE_ACCOUNT_JSON`.
4. Set `FIREBASE_STORAGE_BUCKET` to the bucket name shown in Storage (usually
   `your-project-id.appspot.com`).
5. **Firestore index**: the queue query filters `saleStatus in [...]` AND
   sorts by `createdAt`, which needs a composite index. The first time you
   run it, Firestore will log an error with a direct link to create that
   index automatically — click it once and you're done.

## 4. Set up Google Sheets
1. Create a spreadsheet, add a tab (default name `Orders`, or set
   `GOOGLE_SHEETS_TAB_NAME`).
2. Share that spreadsheet with your service account's email (found inside
   the same JSON key file) as an Editor.
3. You can reuse the *same* service account JSON as Firebase if you enable
   the **Google Sheets API** for that project — otherwise create a second
   service account and put its JSON in `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON`.
4. Copy the spreadsheet ID (the long string in its URL) into
   `GOOGLE_SHEETS_SPREADSHEET_ID`.

## 5. Deploy
Any Node host works (Render, Railway, Fly.io — same idea as the ดวงใจ bot
on Render). Set all the `.env` values as environment variables on the host,
then point LINE's webhook URL at `https://<your-host>/webhook`.

## How the commands work

| Admin does | Bot does |
|---|---|
| Sends a photo | Uploads it to Storage, asks for "ชื่อสินค้า, ราคา" |
| Replies `Sapiens ปกอ่อน, 150` | Creates the order (`#0001`, not_posted, available), writes Sheets row |
| Taps **✅ รายการที่ต้องทำ** | Shows the oldest order that still needs action, as a card |
| Taps **โพสแล้ว** on a card | Marks it posted, shows the next card |
| Types `ขาย 0001 123 ถ.สุขุมวิท กรุงเทพฯ 10110` | Marks it sold + stores the address |
| Taps **จัดส่งแล้ว** on a card | Asks to confirm (ใช่ / ยกเลิก) |
| Taps **ใช่ จัดส่งแล้ว** | Marks it shipped, removes it from the queue, shows the next card |
| Taps **ถัดไป** | Skips to the next card without changing anything |

Only one action button ever appears on a card — it's chosen from the
order's actual status, so there's no button that would do the wrong thing
for where that order currently is.

## Known limitations (fine for one shop, worth knowing about)
- The "which card is the admin looking at" position is stored in memory
  (`src/db/session.js`), so it resets if the server restarts. If multiple
  admins use the bot heavily at once, move that into a Firestore collection
  instead — same shape, just async reads/writes.
- The Google Sheets mirror does a full-column read to find a row to update,
  which is fine for hundreds of orders but would need a smarter lookup (or a
  cached row-number map) at much higher volume.
