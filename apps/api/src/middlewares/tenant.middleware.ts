import { Request, Response, NextFunction } from 'express';
import { Tenant } from '../models/tenant.model';
import { NotFoundError } from '../utils/errors';

/**
 * Resolve the current tenant from the X-Tenant-Slug request header.
 * Injects req.tenant for use by downstream controllers and services.
 *
 * Returns 404 if the slug is missing, unknown, or the tenant is suspended.
 */
export async function resolveTenant(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const slug = (req.headers['x-tenant-slug'] as string | undefined)?.toLowerCase().trim();
    if (!slug) {
      return next(new NotFoundError('租户'));
    }

    const tenant = await Tenant.findOne({ slug, status: { $ne: 'suspended' } });
    if (!tenant) {
      return next(new NotFoundError('租户'));
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
}
