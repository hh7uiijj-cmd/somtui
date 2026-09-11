// Simple in-memory session store, keyed by LINE userId.
// NOTE: this resets if the server restarts. Fine for a single-shop MVP with
// a handful of admins; if that becomes a problem later, move this into a
// Firestore "sessions" collection instead (same shape, just async reads/writes).

const sessions = new Map();

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { pendingImageUrl: null, queueIndex: 0 });
  }
  return sessions.get(userId);
}

function setPendingImage(userId, imageUrl) {
  getSession(userId).pendingImageUrl = imageUrl;
}

function popPendingImage(userId) {
  const session = getSession(userId);
  const url = session.pendingImageUrl;
  session.pendingImageUrl = null;
  return url;
}

function getQueueIndex(userId) {
  return getSession(userId).queueIndex;
}

function setQueueIndex(userId, index) {
  getSession(userId).queueIndex = index;
}

module.exports = {
  getSession,
  setPendingImage,
  popPendingImage,
  getQueueIndex,
  setQueueIndex,
};
