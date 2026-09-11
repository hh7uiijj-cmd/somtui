const { client } = require('../lineClient');
const { bucket } = require('../firebase');
const { setPendingImage } = require('../db/session');
const { buildMainMenuQuickReply } = require('../messages/quickReply');

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function handleImage(event) {
  const userId = event.source.userId;
  const messageId = event.message.id;

  const contentStream = await client.getMessageContent(messageId);
  const buffer = await streamToBuffer(contentStream);

  const filePath = `orders/${messageId}.jpg`;
  const file = bucket.file(filePath);
  await file.save(buffer, { contentType: 'image/jpeg' });
  await file.makePublic();
  const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

  setPendingImage(userId, imageUrl);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'รับรูปแล้วครับ พิมพ์ชื่อสินค้ากับราคา คั่นด้วยจุลภาค เช่น:\nSapiens ปกอ่อน, 150',
    quickReply: buildMainMenuQuickReply(),
  });
}

module.exports = handleImage;
