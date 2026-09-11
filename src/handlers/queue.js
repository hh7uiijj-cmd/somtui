const { client } = require('../lineClient');
const { getActionQueue } = require('../db/orders');
const { getQueueIndex, setQueueIndex } = require('../db/session');
const { buildOrderCard } = require('../messages/flexOrderCard');
const { buildMainMenuQuickReply } = require('../messages/quickReply');

// Builds the message(s) for whatever order sits at the admin's saved queue
// position -- as a message array so callers can prepend a confirmation
// message (e.g. "✅ shipped") in the same reply. incrementFirst=true is used
// for the "ถัดไป" button, to move to the next order before showing it.
// After an action (posted/shipped), call with incrementFirst=false -- the
// queue just got shorter, so the same index now naturally points at the
// next order.
async function buildQueueMessages(userId, { incrementFirst = false } = {}) {
  const queue = await getActionQueue();

  if (queue.length === 0) {
    setQueueIndex(userId, 0);
    return [
      {
        type: 'text',
        text: 'ไม่มีออเดอร์รอดำเนินการแล้วครับ',
        quickReply: buildMainMenuQuickReply(),
      },
    ];
  }

  let index = getQueueIndex(userId);
  if (incrementFirst) index += 1;
  index = index % queue.length;
  setQueueIndex(userId, index);

  return [buildOrderCard(queue[index])];
}

// Convenience wrapper for handlers that only need to show the queue,
// with nothing else to say first.
async function showQueueCard(userId, replyToken, options) {
  const messages = await buildQueueMessages(userId, options);
  return client.replyMessage(replyToken, messages);
}

module.exports = { showQueueCard, buildQueueMessages };
