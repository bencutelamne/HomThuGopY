// Pure-JS RFC 7914 scrypt (N=16384, r=8, p=1) compatible with Node crypto.scryptSync
// so existing scrypt$<salt>$<hex> password hashes in data/store.json verify in static browsers.

const KEY_LEN = 64;
const PREFIX = 'scrypt';
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padLen = ((data.length + 9 + 63) & ~63);
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setUint32(i * 4, h[i], false);
  }
  return out;
}

function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const k = key.length > 64 ? sha256(key) : key;
  const iPad = new Uint8Array(64 + message.length);
  const oPad = new Uint8Array(64 + 32);
  iPad.fill(0x36, 0, 64);
  oPad.fill(0x5c, 0, 64);
  for (let i = 0; i < k.length; i++) {
    iPad[i] ^= k[i];
    oPad[i] ^= k[i];
  }
  iPad.set(message, 64);
  oPad.set(sha256(iPad), 64);
  return sha256(oPad);
}

function pbkdf2HmacSha256OneIter(
  password: Uint8Array,
  salt: Uint8Array,
  dkLen: number,
): Uint8Array {
  const blocks = Math.ceil(dkLen / 32);
  const out = new Uint8Array(blocks * 32);
  const input = new Uint8Array(salt.length + 4);
  input.set(salt, 0);
  const view = new DataView(input.buffer);

  for (let block = 1; block <= blocks; block++) {
    view.setUint32(salt.length, block, false);
    const u = hmacSha256(password, input);
    out.set(u, (block - 1) * 32);
  }
  return out.subarray(0, dkLen);
}

function salsa208(b: Uint32Array): void {
  const x = new Uint32Array(b);
  for (let i = 8; i > 0; i -= 2) {
    let t: number;
    t = (x[0] + x[12]) >>> 0; x[4] ^= (t << 7) | (t >>> 25);
    t = (x[4] + x[0]) >>> 0; x[8] ^= (t << 9) | (t >>> 23);
    t = (x[8] + x[4]) >>> 0; x[12] ^= (t << 13) | (t >>> 19);
    t = (x[12] + x[8]) >>> 0; x[0] ^= (t << 18) | (t >>> 14);
    t = (x[5] + x[1]) >>> 0; x[9] ^= (t << 7) | (t >>> 25);
    t = (x[9] + x[5]) >>> 0; x[13] ^= (t << 9) | (t >>> 23);
    t = (x[13] + x[9]) >>> 0; x[1] ^= (t << 13) | (t >>> 19);
    t = (x[1] + x[13]) >>> 0; x[5] ^= (t << 18) | (t >>> 14);
    t = (x[10] + x[6]) >>> 0; x[14] ^= (t << 7) | (t >>> 25);
    t = (x[14] + x[10]) >>> 0; x[2] ^= (t << 9) | (t >>> 23);
    t = (x[2] + x[14]) >>> 0; x[6] ^= (t << 13) | (t >>> 19);
    t = (x[6] + x[2]) >>> 0; x[10] ^= (t << 18) | (t >>> 14);
    t = (x[15] + x[11]) >>> 0; x[3] ^= (t << 7) | (t >>> 25);
    t = (x[3] + x[15]) >>> 0; x[7] ^= (t << 9) | (t >>> 23);
    t = (x[7] + x[3]) >>> 0; x[11] ^= (t << 13) | (t >>> 19);
    t = (x[11] + x[7]) >>> 0; x[15] ^= (t << 18) | (t >>> 14);

    t = (x[0] + x[3]) >>> 0; x[1] ^= (t << 7) | (t >>> 25);
    t = (x[1] + x[0]) >>> 0; x[2] ^= (t << 9) | (t >>> 23);
    t = (x[2] + x[1]) >>> 0; x[3] ^= (t << 13) | (t >>> 19);
    t = (x[3] + x[2]) >>> 0; x[0] ^= (t << 18) | (t >>> 14);
    t = (x[5] + x[4]) >>> 0; x[6] ^= (t << 7) | (t >>> 25);
    t = (x[6] + x[5]) >>> 0; x[7] ^= (t << 9) | (t >>> 23);
    t = (x[7] + x[6]) >>> 0; x[4] ^= (t << 13) | (t >>> 19);
    t = (x[4] + x[7]) >>> 0; x[5] ^= (t << 18) | (t >>> 14);
    t = (x[10] + x[9]) >>> 0; x[11] ^= (t << 7) | (t >>> 25);
    t = (x[11] + x[10]) >>> 0; x[8] ^= (t << 9) | (t >>> 23);
    t = (x[8] + x[11]) >>> 0; x[9] ^= (t << 13) | (t >>> 19);
    t = (x[9] + x[8]) >>> 0; x[10] ^= (t << 18) | (t >>> 14);
    t = (x[15] + x[14]) >>> 0; x[12] ^= (t << 7) | (t >>> 25);
    t = (x[12] + x[15]) >>> 0; x[13] ^= (t << 9) | (t >>> 23);
    t = (x[13] + x[12]) >>> 0; x[14] ^= (t << 13) | (t >>> 19);
    t = (x[14] + x[13]) >>> 0; x[15] ^= (t << 18) | (t >>> 14);
  }
  for (let i = 0; i < 16; i++) {
    b[i] = (b[i] + x[i]) >>> 0;
  }
}

function blockMix(b: Uint32Array, y: Uint32Array, r: number): void {
  const x = new Uint32Array(16);
  const blockWords = 32 * r;
  x.set(b.subarray(blockWords - 16, blockWords));

  for (let i = 0; i < 2 * r; i++) {
    const srcOffset = i * 16;
    for (let k = 0; k < 16; k++) {
      x[k] ^= b[srcOffset + k];
    }
    salsa208(x);
    const dstIndex = (i & 1) === 0 ? i >> 1 : r + (i >> 1);
    y.set(x, dstIndex * 16);
  }
}

function deriveScryptHex(password: string, salt: string, dkLen: number): string {
  const encoder = new TextEncoder();
  const pwBytes = encoder.encode(password);
  const saltBytes = encoder.encode(salt);
  const bLen = 128 * SCRYPT_R * SCRYPT_P;
  const bBytes = pbkdf2HmacSha256OneIter(pwBytes, saltBytes, bLen);

  const blockWords = 32 * SCRYPT_R;
  const bView = new DataView(bBytes.buffer, bBytes.byteOffset, bBytes.byteLength);
  const x = new Uint32Array(blockWords);
  const y = new Uint32Array(blockWords);
  const v = new Uint32Array(SCRYPT_N * blockWords);

  for (let p = 0; p < SCRYPT_P; p++) {
    const baseByte = p * 128 * SCRYPT_R;
    for (let i = 0; i < blockWords; i++) {
      x[i] = bView.getUint32(baseByte + i * 4, true);
    }

    for (let i = 0; i < SCRYPT_N; i++) {
      v.set(x, i * blockWords);
      blockMix(x, y, SCRYPT_R);
      x.set(y);
    }

    for (let i = 0; i < SCRYPT_N; i++) {
      const j = x[(2 * SCRYPT_R - 1) * 16] & (SCRYPT_N - 1);
      const vOffset = j * blockWords;
      for (let k = 0; k < blockWords; k++) {
        x[k] ^= v[vOffset + k];
      }
      blockMix(x, y, SCRYPT_R);
      x.set(y);
    }

    for (let i = 0; i < blockWords; i++) {
      bView.setUint32(baseByte + i * 4, x[i], true);
    }
  }

  const dk = pbkdf2HmacSha256OneIter(pwBytes, bBytes, dkLen);
  return Array.from(dk, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hashPasswordBrowser(plainPassword: string): string {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = Array.from(saltBytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const derived = deriveScryptHex(plainPassword, salt, KEY_LEN);
  return `${PREFIX}$${salt}$${derived}`;
}

export function verifyPasswordBrowser(plainPassword: string, storedHash: string): boolean {
  if (typeof storedHash !== 'string' || !storedHash) {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== PREFIX) {
    return false;
  }
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex || expectedHex.length % 2 !== 0) {
    return false;
  }
  const actualHex = deriveScryptHex(plainPassword, salt, expectedHex.length / 2);
  if (actualHex.length !== expectedHex.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < actualHex.length; i++) {
    diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}
