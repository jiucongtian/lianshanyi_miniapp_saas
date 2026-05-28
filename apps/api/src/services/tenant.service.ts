import { Tenant, ITenant, ITenantThemeConfig } from '../models/tenant.model';
import { ConflictError, NotFoundError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('TenantService');

export interface CreateTenantDto {
  slug: string;
  name: string;
  plan?: ITenant['plan'];
  themeConfig?: Partial<ITenantThemeConfig>;
  aiConfig?: ITenant['aiConfig'];
}

export interface UpdateThemeDto {
  themeConfig: Partial<ITenantThemeConfig>;
}

export const tenantService = {
  async createTenant(dto: CreateTenantDto): Promise<ITenant> {
    const existing = await Tenant.findOne({ slug: dto.slug.toLowerCase() });
    if (existing) {
      throw new ConflictError(`租户 slug "${dto.slug}" 已存在`);
    }

    const tenant = await Tenant.create({
      slug: dto.slug.toLowerCase(),
      name: dto.name,
      plan: dto.plan ?? 'trial',
      status: 'active',
      themeConfig: dto.themeConfig ?? {},
      aiConfig: dto.aiConfig ?? { provider: 'mock' },
    });

    log.info({ slug: tenant.slug }, 'Tenant created');
    return tenant;
  },

  async getPublicConfig(slug: string): Promise<ITenant> {
    const tenant = await Tenant.findOne({ slug: slug.toLowerCase(), status: { $ne: 'suspended' } });
    if (!tenant) throw new NotFoundError('租户');
    return tenant;
  },

  async updateTheme(slug: string, dto: UpdateThemeDto): Promise<ITenant> {
    const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });
    if (!tenant) throw new NotFoundError('租户');

    // Deep merge themeConfig (cast via unknown to handle Mongoose subdoc)
    const existing = (tenant.themeConfig as unknown as { toObject?: () => ITenantThemeConfig }).toObject?.()
      ?? (tenant.themeConfig as unknown as ITenantThemeConfig);
    const merged: ITenantThemeConfig = {
      ...existing,
      ...dto.themeConfig,
      copy: {
        ...existing.copy,
        ...dto.themeConfig.copy,
      },
      features: {
        ...existing.features,
        ...dto.themeConfig.features,
      },
    };
    tenant.themeConfig = merged;
    await tenant.save();

    log.info({ slug }, 'Tenant theme updated');
    return tenant;
  },

  async listTenants(): Promise<ITenant[]> {
    return Tenant.find().sort({ createdAt: -1 }).exec();
  },

  async suspendTenant(slug: string): Promise<ITenant> {
    const tenant = await Tenant.findOneAndUpdate(
      { slug: slug.toLowerCase() },
      { status: 'suspended' },
      { new: true },
    );
    if (!tenant) throw new NotFoundError('租户');
    log.info({ slug }, 'Tenant suspended');
    return tenant;
  },
};
