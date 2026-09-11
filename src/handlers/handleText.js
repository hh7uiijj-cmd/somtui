const { client } = require('../lineClient');
const { popPendingImage, getSession } = require('../db/session');
const { createOrder, markSold, getOrder } = require('../db/orders');
const { appendOrderRow, updateOrderRow } = require('../db/sheets');
const { buildMainMenuQuickReply } = require('../messages/quickReply');
const { showQueueCard } = require('./queue');

// "ขาย 0007 123 ถ.สุขุมวิท กรุงเทพฯ 10110" or "ขาย #0007 123 ถ.สุขุมวิท..."
const SOLD_PATTERN = /^ขาย\s*#?(\S+)\s+([\s\S]+)$/;

async function replyText(replyToken, text) {
  return client.replyMessage(replyToken, {
    type: 'text',
    text,
    quickReply: buildMainMenuQuickReply(),
  });
}

async function handleText(event) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const text = event.message.text.trim();

  // 1) Main menu: "เพิ่มออเดอร์"
  if (text === 'เพิ่มออเดอร์') {
    return replyText(replyToken, 'ส่งรูปสินค้ามาได้เลยครับ');
  }

  // 2) Main menu: "รายการที่ต้องทำ"
  if (text === 'รายการที่ต้องทำ') {
    return showQueueCard(userId, replyToken);
  }

  // 3) A photo is waiting for its name + price
  const session = getSession(userId);
  if (session.pendingImageUrl) {
    const parts = text.split(',').map((p) => p.trim());
    if (parts.length < 2 || !parts[1]) {
      return replyText(
        replyToken,
        'รูปแบบไม่ถูกต้องครับ พิมพ์เป็น "ชื่อสินค้า, ราคา" เช่น Sapiens ปกอ่อน, 150'
      );
    }
    const [itemName, priceRaw] = parts;
    const price = Number(priceRaw.replace(/[^\d.]/g, ''));
    if (!price) {
      return replyText(replyToken, 'ราคาต้องเป็นตัวเลขครับ ลองพิมพ์ใหม่อีกครั้ง');
    }

    const imageUrl = popPendingImage(userId);
    const order = await createOrder({ imageUrl, itemName, price });
    await appendOrderRow(order);

    return replyText(replyToken, `✅ เพิ่มออเดอร์ #${order.orderId} "${itemName}" ราคา ${price} บาทแล้วครับ`);
  }

  // 4) "ขาย <orderId> <address>"
  const soldMatch = text.match(SOLD_PATTERN);
  if (soldMatch) {
    const [, orderId, address] = soldMatch;
    const existing = await getOrder(orderId);
    if (!existing) {
      return replyText(replyToken, `ไม่พบออเดอร์ #${orderId} ครับ เช็คเลขอีกครั้ง`);
    }
    const updated = await markSold(orderId, address);
    await updateOrderRow(updated);
    return replyText(replyToken, `✅ #${orderId} บันทึกเป็นขายแล้ว พร้อมที่อยู่จัดส่งแล้วครับ`);
  }

  // 5) Fallback / help
  return replyText(
    replyToken,
    'พิมพ์ "ขาย <เลขออเดอร์> <ที่อยู่>" เพื่อบันทึกการขาย เช่น\nขาย 0007 123 ถ.สุขุมวิท กรุงเทพฯ 10110\n\nหรือกดปุ่มด้านล่างได้เลยครับ'
  );
}

module.exports = handleText;
