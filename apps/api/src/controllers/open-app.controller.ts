import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from '../services/open-app.service';

const createSchema = z.object({
  name: z.string().min(1),
  accountId: z.string().min(1),
  scopes: z.array(z.string()).min(1),
  rateLimit: z.object({ windowMs: z.number(), max: z.number() }).optional(),
});

const updateScopesSchema = z.object({ scopes: z.array(z.string()).min(1) });

export async function createApp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createSchema.parse(req.body);
    const { app, appSecret } = await svc.createApp(body);
    res.status(201).json({ success: true, data: { ...app, appSecret }, error: null, code: null });
  } catch (err) { next(err); }
}

export async function listApps(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apps = await svc.listApps(req.query.accountId as string | undefined);
    res.json({ success: true, data: apps, error: null, code: null });
  } catch (err) { next(err); }
}

export async function getApp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const app = await svc.getApp(req.params.appId);
    res.json({ success: true, data: app, error: null, code: null });
  } catch (err) { next(err); }
}

export async function rotateSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await svc.rotateSecret(req.params.appId);
    res.json({ success: true, data: result, error: null, code: null });
  } catch (err) { next(err); }
}

export async function setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = z.object({ status: z.enum(['active', 'disabled']) }).parse(req.body);
    await svc.setStatus(req.params.appId, status);
    res.json({ success: true, data: null, error: null, code: null });
  } catch (err) { next(err); }
}

export async function updateScopes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { scopes } = updateScopesSchema.parse(req.body);
    await svc.updateScopes(req.params.appId, scopes);
    res.json({ success: true, data: null, error: null, code: null });
  } catch (err) { next(err); }
}
