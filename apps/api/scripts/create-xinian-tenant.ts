import 'dotenv/config';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/tenant.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI!);

  const tenant = await Tenant.findOneAndUpdate(
    { slug: 'xinian' },
    {
      slug: 'xinian',
      name: '禧念珠宝',
      status: 'active',
      plan: 'basic',
      themeConfig: {
        brandName: '禧念珠宝',
        primaryColor: '#C8960C',
        bgColor: '#FDF8EE',
        cardBgColor: '#FFFDF5',
        buttonColor: '#C8960C',
        copy: {
          homeTitle: '禧念珠宝',
          homeSubtitle: 'Jewelry & Blessing',
          drawButtonText: '探寻今日缘分',
          inputPlaceholder: '说出你的心愿，空着也没关系',
          tabInsight: '缘分洞见',
          tabDaily: '每日禧运',
        },
        features: {
          showDailyInsight: true,
          showAssistant: true,
          requireLogin: false,
        },
      },
      aiConfig: { provider: 'mock' },
      limits: { dailyDrawCount: 3, maxUsers: 5000 },
    },
    { upsert: true, new: true },
  );

  console.log('✅ 禧念珠宝 tenant created:', tenant._id.toString());
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
