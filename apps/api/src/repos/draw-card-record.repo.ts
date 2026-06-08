import mongoose from 'mongoose';
import { DrawCardRecord, IDrawCardRecord } from '../models/draw-card-record.model';
import { TenantRepo } from './TenantRepo';

export class DrawCardRecordRepo extends TenantRepo<IDrawCardRecord> {
  constructor(tenantId: string) {
    super(DrawCardRecord, tenantId);
  }

  create(data: Omit<mongoose.AnyKeys<IDrawCardRecord>, 'tenantId'>) {
    return this._create(data);
  }
}
