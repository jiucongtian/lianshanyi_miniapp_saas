import crypto from 'crypto';

export function signRequest(opts: {
  appSecret: string;
  method: string;
  path: string;
  body?: string;
}): { 'X-Timestamp': string; 'X-Nonce': string; 'X-Signature': string } {
  const { appSecret, method, path, body = '' } = opts;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString('hex');
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  const signStr = [method.toUpperCase(), path, timestamp, nonce, bodyHash].join('\n');
  const signature = crypto.createHmac('sha256', appSecret).update(signStr).digest('hex');
  return { 'X-Timestamp': timestamp, 'X-Nonce': nonce, 'X-Signature': signature };
}
