const store = new Map();

export function readCache(key, fallback = null) {
  if (!store.has(key)) return fallback;
  return store.get(key);
}

export function writeCache(key, value) {
  store.set(key, value);
}

export function clearCache(key) {
  store.delete(key);
}
