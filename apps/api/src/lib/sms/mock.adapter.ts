import { SmsAdapter } from './adapter';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('SmsMock');

export const mockSmsAdapter: SmsAdapter = {
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    // In development: log the code instead of sending it
    log.info({ phone, code }, '[MOCK SMS] Verification code (not sent)');
    // Simulate async delay
    await new Promise((resolve) => setTimeout(resolve, 50));
  },
};
