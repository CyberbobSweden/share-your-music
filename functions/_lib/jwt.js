// Minimal HS256 JWT implementation using the platform's Web Crypto API.
// No dependencies — Cloudflare's Workers runtime supports crypto.subtle natively.

function b64urlEncode(bytes) {
  let binary = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

export async function signJWT(payload, secret, expiresInSeconds = 60 * 60 * 24 * 30) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
  const encHeader = b64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = b64urlEncode(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const data = `${encHeader}.${encPayload}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${b64urlEncode(sig)}`;
}

export async function verifyJWT(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encHeader, encPayload, encSig] = parts;
  const data = `${encHeader}.${encPayload}`;
  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify('HMAC', key, b64urlDecode(encSig), new TextEncoder().encode(data));
  if (!valid) return null;
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(encPayload)));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}
