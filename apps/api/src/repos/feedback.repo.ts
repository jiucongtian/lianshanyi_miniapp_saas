import mongoose from 'mongoose';
import { Feedback, IFeedback } from '../models/feedback.model';
import { TenantRepo } from './TenantRepo';

export class FeedbackRepo extends TenantRepo<IFeedback> {
  constructor(tenantId: string) {
    super(Feedback, tenantId);
  }

  create(data: Omit<mongoose.AnyKeys<IFeedback>, 'tenantId'>) {
    return this._create(data);
  }
}
