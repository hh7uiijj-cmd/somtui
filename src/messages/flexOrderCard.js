const { buildMainMenuQuickReply } = require('./quickReply');

// Only ONE action button ever shows on a card, chosen from the order's
// actual status -- this is the "can't press the wrong button" guardrail:
// if the action isn't valid yet, the button simply isn't there.
function buildActionButton(order) {
  if (order.postStatus === 'not_posted') {
    return {
      type: 'button',
      style: 'primary',
      color: '#3C3489',
      action: {
        type: 'postback',
        label: 'โพสแล้ว',
        data: `action=posted&orderId=${order.orderId}`,
        displayText: `โพสแล้ว #${order.orderId}`,
      },
    };
  }
  if (order.saleStatus === 'sold') {
    return {
      type: 'button',
      style: 'primary',
      color: '#0F6E56',
      action: {
        type: 'postback',
        label: 'จัดส่งแล้ว',
        data: `action=confirmShip&orderId=${order.orderId}`,
        displayText: `จัดส่งแล้ว #${order.orderId}`,
      },
    };
  }
  // Posted, but not sold yet -- waiting on a manual "ขาย #id ที่อยู่..." message.
  // No button here on purpose: selling requires typing an address, which
  // doesn't fit a quick reply button.
  return null;
}

function buildOrderCard(order) {
  const bodyContents = [
    { type: 'text', text: `#${order.orderId} ${order.itemName}`, weight: 'bold', size: 'md', wrap: true },
    { type: 'text', text: `ราคา ${order.price} บาท`, size: 'sm', color: '#888880' },
    {
      type: 'text',
      text: order.postStatus === 'posted' ? 'สถานะโพสต์: โพสแล้ว' : 'สถานะโพสต์: ยังไม่โพส',
      size: 'sm',
      color: '#888880',
    },
  ];

  if (order.saleStatus === 'sold') {
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push({ type: 'text', text: 'ที่อยู่จัดส่ง', size: 'sm', weight: 'bold', margin: 'md' });
    bodyContents.push({ type: 'text', text: order.address || '-', size: 'sm', wrap: true });
  } else {
    bodyContents.push({ type: 'text', text: 'ยังไม่ขาย', size: 'sm', color: '#888880' });
  }

  const footerButtons = [];
  const actionButton = buildActionButton(order);
  if (actionButton) footerButtons.push(actionButton);
  footerButtons.push({
    type: 'button',
    style: 'secondary',
    action: { type: 'postback', label: 'ถัดไป', data: 'action=next', displayText: 'ถัดไป' },
  });

  const bubble = {
    type: 'bubble',
    hero: order.imageUrl
      ? { type: 'image', url: order.imageUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' }
      : undefined,
    body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: bodyContents },
    footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: footerButtons },
  };

  return {
    type: 'flex',
    altText: `ออเดอร์ #${order.orderId} ${order.itemName}`,
    contents: bubble,
    quickReply: buildMainMenuQuickReply(),
  };
}

module.exports = { buildOrderCard };
