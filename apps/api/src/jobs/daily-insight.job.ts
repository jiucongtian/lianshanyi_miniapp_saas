import cron from 'node-cron';
import { Tenant } from '../models/tenant.model';
import { dailyInsightService } from '../services/daily-insight.service';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('DailyInsightJob');

const CRON_SCHEDULE = process.env.DAILY_INSIGHT_CRON ?? '0 0 * * *'; // midnight by default

export function scheduleDailyInsightJob(): void {
  cron.schedule(CRON_SCHEDULE, async () => {
    const today = new Date().toISOString().slice(0, 10);
    log.info({ date: today }, 'Running daily insight generation for all active tenants');

    try {
      // Generate insight for every active tenant
      const tenants = await Tenant.find({ status: { $ne: 'suspended' } }).select('_id slug').lean();

      await Promise.allSettled(
        tenants.map(async (tenant) => {
          try {
            const insight = await dailyInsightService.generateForDate(
              tenant._id.toString(),
              today,
            );
            log.info(
              { tenantId: tenant._id.toString(), slug: tenant.slug, date: today, cardId: insight.cardId },
              'Daily insight generated',
            );
          } catch (err) {
            log.error(
              { err, tenantId: tenant._id.toString(), slug: tenant.slug, date: today },
              'Failed to generate daily insight for tenant',
            );
          }
        }),
      );
    } catch (err) {
      log.error({ err, date: today }, 'Failed to fetch tenants for daily insight job');
    }
  });
}
