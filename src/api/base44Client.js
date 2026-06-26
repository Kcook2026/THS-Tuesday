import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const _client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: true,
  appBaseUrl
});

// --- Concurrency limiter + automatic retry on rate-limit (429) ---
// Prevents "Rate limit exceeded" errors when many API calls fire at once.

const API_METHODS = new Set([
  'list', 'filter', 'get', 'create', 'update', 'delete',
  'bulkCreate', 'bulkUpdate', 'updateMany', 'deleteMany',
  'me', 'invoke', 'inviteUser'
]);

const MAX_CONCURRENT = 6;
let _active = 0;
const _queue = [];

function _acquire() {
  if (_active < MAX_CONCURRENT) { _active++; return Promise.resolve(); }
  return new Promise(r => _queue.push(() => { _active++; r(); }));
}

function _release() {
  _active--;
  if (_queue.length) _queue.shift()();
}

async function _guarded(fn) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await _acquire();
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status || err?.statusCode;
      const isRL = status === 429 ||
        (err?.message || '').toLowerCase().includes('rate limit');
      if (!isRL || attempt === 3) throw err;
      await new Promise(r => setTimeout(r, Math.min(400 * 2 ** attempt, 4000)));
    } finally {
      _release();
    }
  }
}

function _wrapObj(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return new Proxy(obj, {
    get(target, key, receiver) {
      const v = Reflect.get(target, key, receiver);
      if (typeof v === 'function') {
        if (API_METHODS.has(key)) {
          return (...args) => _guarded(() => v.apply(target, args));
        }
        return v.bind(target);
      }
      if (v && typeof v === 'object') {
        return _wrapObj(v);
      }
      return v;
    }
  });
}

export const base44 = new Proxy(_client, {
  get(target, key, receiver) {
    if (key === 'entities' || key === 'auth' || key === 'functions' || key === 'users') {
      const v = Reflect.get(target, key, receiver);
      return _wrapObj(v);
    }
    return Reflect.get(target, key, receiver);
  }
});