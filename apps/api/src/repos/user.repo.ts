import mongoose from 'mongoose';
import { User, IUser } from '../models/user.model';
import { TenantRepo } from './TenantRepo';

export class UserRepo extends TenantRepo<IUser> {
  constructor(tenantId: string) {
    super(User, tenantId);
  }

  create(data: Omit<mongoose.AnyKeys<IUser>, 'tenantId'>) {
    return this._create(data);
  }
}
