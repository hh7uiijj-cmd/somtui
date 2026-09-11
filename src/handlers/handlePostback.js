const { client } = require('../lineClient');
const { markPosted, markShipped, getOrder } = require('../db/orders');
const { updateOrderRow } = require('../db/sheets');
const { buildMainMenuQuickReply } = require('../messages/quickReply');
const { buildQueueMessages } = require('./queue');

async function handlePostback(event) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const params = new URLSearchParams(event.postback.data);
  const action = params.get('action');
  const orderId = params.get('orderId');

  if (action === 'next') {
    const messages = await buildQueueMessages(userId, { incrementFirst: true });
    return client.replyMessage(replyToken, messages);
  }

  if (action === 'posted') {
    const updated = await markPosted(orderId);
    await updateOrderRow(updated);
    const messages = await buildQueueMessages(userId, { incrementFirst: false });
    messages.unshift({ type: 'text', text: `✅ #${orderId} อัปเดตเป็นโพสแล้ว` });
    return client.replyMessage(replyToken, messages);
  }

  // "จัดส่งแล้ว" removes the order from the active queue -- hard to undo,
  // so it gets a one-tap confirmation instead of firing immediately.
  if (action === 'confirmShip') {
    const order = await getOrder(orderId);
    if (!order) {
      return client.replyMessage(replyToken, {
        type: 'text',
        text: `ไม่พบออเดอร์ #${orderId} ครับ`,
        quickReply: buildMainMenuQuickReply(),
      });
    }
    return client.replyMessage(replyToken, {
      type: 'text',
      text: `ยืนยันว่าออเดอร์ #${orderId} "${order.itemName}" จัดส่งแล้วใช่ไหมครับ?`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'postback',
              label: 'ใช่ จัดส่งแล้ว',
              data: `action=shipped&orderId=${orderId}`,
              displayText: `ยืนยันจัดส่งแล้ว #${orderId}`,
            },
          },
          {
            type: 'action',
            action: { type: 'postback', label: 'ยกเลิก', data: 'action=cancel', displayText: 'ยกเลิก' },
          },
        ],
      },
    });
  }

  if (action === 'shipped') {
    const updated = await markShipped(orderId);
    await updateOrderRow(updated);
    const messages = await buildQueueMessages(userId, { incrementFirst: false });
    messages.unshift({ type: 'text', text: `✅ #${orderId} จัดส่งแล้ว ลบออกจากคิวแล้วครับ` });
    return client.replyMessage(replyToken, messages);
  }

  if (action === 'cancel') {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: 'ยกเลิกแล้วครับ',
      quickReply: buildMainMenuQuickReply(),
    });
  }

  return client.replyMessage(replyToken, {
    type: 'text',
    text: 'คำสั่งไม่ถูกต้องครับ',
    quickReply: buildMainMenuQuickReply(),
  });
}

module.exports = handlePostback;
