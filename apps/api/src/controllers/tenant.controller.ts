import { Request, Response, NextFunction } from 'express';
import { tenantService } from '../services/tenant.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

export const tenantController = {
  /** GET /api/v1/tenants/public/:slug/config — no auth required */
  async getPublicConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params as { slug: string };
      const tenant = await tenantService.getPublicConfig(slug);
      sendSuccess(res, {
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        themeConfig: tenant.themeConfig,
        limits: tenant.limits,
      });
    } catch (err) {
      next(err);
    }
  },

  /** POST /api/v1/tenants — super admin only */
  async createTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug, name, plan, themeConfig, aiConfig } = req.body as {
        slug?: unknown;
        name?: unknown;
        plan?: unknown;
        themeConfig?: unknown;
        aiConfig?: unknown;
      };

      if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        throw new ValidationError('slug 不能为空');
      }
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new ValidationError('name 不能为空');
      }
      if (!/^[a-z0-9-]+$/.test(slug.trim())) {
        throw new ValidationError('slug 只能包含小写字母、数字和连字符');
      }

      const tenant = await tenantService.createTenant({
        slug: slug.trim(),
        name: name.trim(),
        plan: plan as 'trial' | 'basic' | 'pro' | undefined,
        themeConfig: typeof themeConfig === 'object' && themeConfig !== null
          ? themeConfig as Parameters<typeof tenantService.createTenant>[0]['themeConfig']
          : undefined,
        aiConfig: typeof aiConfig === 'object' && aiConfig !== null
          ? aiConfig as Parameters<typeof tenantService.createTenant>[0]['aiConfig']
          : undefined,
      });

      sendSuccess(res, tenant, 201);
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /api/v1/tenants/:slug/theme — tenant admin */
  async updateTheme(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params as { slug: string };
      const { themeConfig } = req.body as { themeConfig?: unknown };

      if (!themeConfig || typeof themeConfig !== 'object') {
        throw new ValidationError('themeConfig 不能为空');
      }

      const tenant = await tenantService.updateTheme(slug, {
        themeConfig: themeConfig as Parameters<typeof tenantService.updateTheme>[1]['themeConfig'],
      });
      sendSuccess(res, tenant);
    } catch (err) {
      next(err);
    }
  },

  /** GET /api/v1/tenants — super admin only */
  async listTenants(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenants = await tenantService.listTenants();
      sendSuccess(res, tenants);
    } catch (err) {
      next(err);
    }
  },
};
