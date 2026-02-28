// 轻量鉴权 Token：用于登录态签名与校验（Edge 友好）
// 说明：不依赖 Node.js crypto，仅使用 Web Crypto，便于在 middleware 中复用

export type AuthTokenPayload = {
  email: string;
  // 过期时间（时间戳，毫秒）
  exp: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  // Edge Runtime 自带 btoa/atob，这里不引入 Node 依赖，避免运行时不兼容
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// 生成签名 Token：payload 会被签名并附带过期时间
export async function signAuthToken(payload: AuthTokenPayload, secret: string) {
  const data = JSON.stringify(payload);
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return `${base64UrlEncode(encoder.encode(data))}.${base64UrlEncode(
    new Uint8Array(signature)
  )}`;
}

// 校验签名 Token：返回 payload 或 null
export async function verifyAuthToken(token: string, secret: string) {
  const [dataPart, sigPart] = token.split('.');
  if (!dataPart || !sigPart) {
    return null;
  }

  const dataBytes = base64UrlDecode(dataPart);
  const sigBytes = base64UrlDecode(sigPart);
  const key = await getHmacKey(secret);

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, dataBytes);
  if (!valid) {
    return null;
  }

  const payload = JSON.parse(decoder.decode(dataBytes)) as AuthTokenPayload;
  if (!payload?.exp || payload.exp < Date.now()) {
    return null;
  }
  return payload;
}
