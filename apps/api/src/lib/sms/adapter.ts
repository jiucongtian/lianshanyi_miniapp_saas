export interface SmsAdapter {
  sendVerificationCode(phone: string, code: string): Promise<void>;
}

export function createSmsAdapter(): SmsAdapter {
  const provider = process.env.SMS_PROVIDER ?? 'mock';
  switch (provider) {
    case 'mock':
      return import('./mock.adapter').then((m) => m.mockSmsAdapter) as unknown as SmsAdapter;
    case 'aliyun':
      return import('./aliyun.adapter').then((m) => m.aliyunSmsAdapter) as unknown as SmsAdapter;
    default:
      throw new Error(`Unknown SMS provider: ${provider}`);
  }
}

// Lazy singleton
let _adapter: SmsAdapter | null = null;

export async function getSmsAdapter(): Promise<SmsAdapter> {
  if (!_adapter) {
    const provider = process.env.SMS_PROVIDER ?? 'mock';
    if (provider === 'mock') {
      const { mockSmsAdapter } = await import('./mock.adapter');
      _adapter = mockSmsAdapter;
    } else if (provider === 'aliyun') {
      const { aliyunSmsAdapter } = await import('./aliyun.adapter');
      _adapter = aliyunSmsAdapter;
    } else {
      throw new Error(`Unknown SMS provider: ${provider}`);
    }
  }
  return _adapter;
}
