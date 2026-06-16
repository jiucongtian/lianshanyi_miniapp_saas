import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from '../../services/open-app.service';

const createSchema = z.object({
  name: z.string().min(1),
  remark: z.string().optional(),
  accountId: z.string().min(1),
  scopes: z.array(z.string()).min(1),
  rateLimit: z.object({ windowMs: z.number(), max: z.number() }).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  remark: z.string().optional(),
  scopes: z.array(z.string()).min(1).optional(),
  rateLimit: z.object({ windowMs: z.number(), max: z.number() }).optional(),
});

export async function listCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apps = await svc.listApps(req.query.accountId as string | undefined);
    res.json({ success: true, data: apps, error: null, code: null });
  } catch (err) { next(err); }
}

export async function createCredential(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createSchema.parse(req.body);
    const { app, appSecret } = await svc.createApp(body);
    res.status(201).json({ success: true, data: { ...app.toJSON(), appSecret }, error: null, code: null });
  } catch (err) { next(err); }
}

export async function getCredential(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const app = await svc.getApp(req.params.appId);
    res.json({ success: true, data: app, error: null, code: null });
  } catch (err) { next(err); }
}

export async function updateCredential(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateSchema.parse(req.body);
    await svc.updateApp(req.params.appId, body);
    res.json({ success: true, data: null, error: null, code: null });
  } catch (err) { next(err); }
}

export async function rotateSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await svc.rotateSecret(req.params.appId);
    res.json({ success: true, data: result, error: null, code: null });
  } catch (err) { next(err); }
}

export async function revealSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await svc.revealSecret(req.params.appId);
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
