function buildMainMenuQuickReply() {
  return {
    items: [
      {
        type: 'action',
        action: { type: 'message', label: '📷 เพิ่มออเดอร์', text: 'เพิ่มออเดอร์' },
      },
      {
        type: 'action',
        action: { type: 'message', label: '✅ รายการที่ต้องทำ', text: 'รายการที่ต้องทำ' },
      },
    ],
  };
}

module.exports = { buildMainMenuQuickReply };
