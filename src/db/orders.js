const { admin, db } = require('../firebase');

const COLLECTION = 'orders';
const COUNTER_REF = db.collection('meta').doc('orderCounter');

// Generates order IDs like "0001", "0002", ... using a Firestore transaction
// so two admins adding orders at the same time never collide.
async function getNextOrderId() {
  const nextNumber = await db.runTransaction(async (tx) => {
    const snap = await tx.get(COUNTER_REF);
    const current = snap.exists ? snap.data().value : 0;
    const next = current + 1;
    tx.set(COUNTER_REF, { value: next });
    return next;
  });
  return String(nextNumber).padStart(4, '0');
}

async function createOrder({ imageUrl, itemName, price }) {
  const orderId = await getNextOrderId();
  const order = {
    orderId,
    imageUrl,
    itemName,
    price,
    postStatus: 'not_posted', // 'not_posted' | 'posted'
    saleStatus: 'available', // 'available' | 'sold' | 'shipped'
    address: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    soldAt: null,
    shippedAt: null,
  };
  await db.collection(COLLECTION).doc(orderId).set(order);
  return { ...order, createdAt: new Date() };
}

async function getOrder(orderId) {
  const doc = await db.collection(COLLECTION).doc(orderId).get();
  return doc.exists ? doc.data() : null;
}

async function markPosted(orderId) {
  await db.collection(COLLECTION).doc(orderId).update({ postStatus: 'posted' });
  return getOrder(orderId);
}

async function markSold(orderId, address) {
  await db.collection(COLLECTION).doc(orderId).update({
    saleStatus: 'sold',
    address,
    soldAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return getOrder(orderId);
}

async function markShipped(orderId) {
  await db.collection(COLLECTION).doc(orderId).update({
    saleStatus: 'shipped',
    shippedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return getOrder(orderId);
}

// "Things still needing admin action": not posted yet, OR sold but not shipped.
// Sorted oldest-first so the queue works through orders in the order they were created.
async function getActionQueue() {
  const snapshot = await db
    .collection(COLLECTION)
    .where('saleStatus', 'in', ['available', 'sold'])
    .orderBy('createdAt', 'asc')
    .get();
  return snapshot.docs.map((d) => d.data());
}

module.exports = {
  createOrder,
  getOrder,
  markPosted,
  markSold,
  markShipped,
  getActionQueue,
};
