import { SmsAdapter } from './adapter';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('SmsAliyun');

// Placeholder — wire up @alicloud/pop-core or aliyun-sdk when SMS_PROVIDER=aliyun
export const aliyunSmsAdapter: SmsAdapter = {
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    const signName = process.env.ALIYUN_SMS_SIGN_NAME;
    const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

    if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
      throw new Error('Aliyun SMS config missing — check .env');
    }

    // TODO: implement Aliyun SMS SDK call
    log.info({ phone }, 'Aliyun SMS stub called — not yet implemented');
    throw new Error('Aliyun SMS not yet implemented');
  },
};
