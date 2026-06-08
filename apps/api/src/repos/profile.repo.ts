import mongoose from 'mongoose';
import { Profile, IProfile } from '../models/profile.model';
import { TenantRepo } from './TenantRepo';

export class ProfileRepo extends TenantRepo<IProfile> {
  constructor(tenantId: string) {
    super(Profile, tenantId);
  }

  create(data: Omit<mongoose.AnyKeys<IProfile>, 'tenantId'>) {
    return this._create(data);
  }
}
