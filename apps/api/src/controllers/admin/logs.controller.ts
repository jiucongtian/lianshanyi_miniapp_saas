import { Request, Response, NextFunction } from 'express';
import { OpenApiLog } from '../../models/open-api-log.model';
import { DrawCardRecord } from '../../models/draw-card-record.model';
import { DailyInsight } from '../../models/daily-insight.model';

export async function listLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { appId, path: p, statusCode, from, to, page = '1', limit = '50' } = req.query as Record<string, string>;
    const pg = Math.max(1, parseInt(page));
    const lm = Math.min(200, parseInt(limit));

    const filter: Record<string, unknown> = {};
    if (appId) filter['appId'] = appId;
    if (p) filter['path'] = { $regex: p };
    if (statusCode) filter['statusCode'] = parseInt(statusCode);
    if (from || to) {
      filter['createdAt'] = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      OpenApiLog.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lm).limit(lm).lean(),
      OpenApiLog.countDocuments(filter),
    ]);
    res.json({ success: true, data: { logs, meta: { total, page: pg, limit: lm } }, error: null, code: null });
  } catch (err) { next(err); }
}

export async function getUsageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { appId, from, to } = req.query as Record<string, string>;
    const dateFilter: Record<string, unknown> = {};
    if (from || to) {
      dateFilter['createdAt'] = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }
    const matchStage: Record<string, unknown> = { ...dateFilter };
    if (appId) matchStage['appId'] = appId;

    const stats = await OpenApiLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { appId: '$appId', path: '$path' },
          total: { $sum: 1 },
          success: { $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] } },
          avgLatencyMs: { $avg: '$latencyMs' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 100 },
    ]);

    res.json({ success: true, data: stats, error: null, code: null });
  } catch (err) { next(err); }
}

export async function getOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalLogs, recentLogs, totalCards, recentCards, totalInsights, recentInsights] = await Promise.all([
      OpenApiLog.countDocuments(),
      OpenApiLog.countDocuments({ createdAt: { $gte: since } }),
      DrawCardRecord.countDocuments(),
      DrawCardRecord.countDocuments({ createdAt: { $gte: since } }),
      DailyInsight.countDocuments(),
      DailyInsight.countDocuments({ createdAt: { $gte: since } }),
    ]);

    res.json({
      success: true,
      data: {
        apiCalls: { total: totalLogs, last30d: recentLogs },
        cardDraws: { total: totalCards, last30d: recentCards },
        dailyInsights: { total: totalInsights, last30d: recentInsights },
      },
      error: null,
      code: null,
    });
  } catch (err) { next(err); }
}
