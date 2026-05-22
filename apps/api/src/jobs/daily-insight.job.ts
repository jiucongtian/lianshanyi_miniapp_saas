import cron from 'node-cron';
import { dailyInsightService } from '../services/daily-insight.service';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('DailyInsightJob');

const CRON_SCHEDULE = process.env.DAILY_INSIGHT_CRON ?? '0 0 * * *'; // midnight by default

export function scheduleDailyInsightJob(): void {
  cron.schedule(CRON_SCHEDULE, async () => {
    const today = new Date().toISOString().slice(0, 10);
    log.info({ date: today }, 'Running daily insight generation');

    try {
      const insight = await dailyInsightService.generateForDate(today);
      log.info({ date: today, cardId: insight.cardId }, 'Daily insight generated');
    } catch (err) {
      log.error({ err, date: today }, 'Failed to generate daily insight');
    }
  });
}
