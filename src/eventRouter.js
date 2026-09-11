const { client } = require('./lineClient');
const { buildMainMenuQuickReply } = require('./messages/quickReply');
const handleImage = require('./handlers/handleImage');
const handleText = require('./handlers/handleText');
const handlePostback = require('./handlers/handlePostback');

async function handleEvent(event) {
  try {
    if (event.type === 'message' && event.message.type === 'image') {
      return await handleImage(event);
    }
    if (event.type === 'message' && event.message.type === 'text') {
      return await handleText(event);
    }
    if (event.type === 'postback') {
      return await handlePostback(event);
    }
    // Other event types (follow, join, sticker, etc.) are ignored for now.
    return null;
  } catch (err) {
    console.error('handleEvent error:', err);
    if (event.replyToken) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งครับ',
        quickReply: buildMainMenuQuickReply(),
      });
    }
    return null;
  }
}

module.exports = { handleEvent };
