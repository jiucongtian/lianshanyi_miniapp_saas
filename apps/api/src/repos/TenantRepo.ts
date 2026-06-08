import mongoose, { Model, Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

/**
 * Base repository that hard-bakes tenantId into every query.
 * Extend this for any model that has a tenantId field.
 * Callers never need to pass tenantId — it is injected automatically.
 */
export class TenantRepo<T extends Document> {
  protected readonly tid: mongoose.Types.ObjectId;

  constructor(protected readonly model: Model<T>, tenantId: string) {
    this.tid = new mongoose.Types.ObjectId(tenantId);
  }

  /** Prepend tenantId to any filter object. */
  protected scoped(filter: FilterQuery<T> = {}): FilterQuery<T> {
    return { ...filter, tenantId: this.tid } as FilterQuery<T>;
  }

  find(filter: FilterQuery<T> = {}) {
    return this.model.find(this.scoped(filter));
  }

  findOne(filter: FilterQuery<T> = {}) {
    return this.model.findOne(this.scoped(filter));
  }

  countDocuments(filter: FilterQuery<T> = {}) {
    return this.model.countDocuments(this.scoped(filter));
  }

  findOneAndUpdate(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: QueryOptions<T> = {},
  ) {
    return this.model.findOneAndUpdate(this.scoped(filter), update, options);
  }

  updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>) {
    return this.model.updateOne(this.scoped(filter), update);
  }

  updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>) {
    return this.model.updateMany(this.scoped(filter), update);
  }

  deleteOne(filter: FilterQuery<T>) {
    return this.model.deleteOne(this.scoped(filter));
  }

  /** Create a document with tenantId automatically set. */
  protected _create(data: mongoose.AnyKeys<T> & mongoose.AnyObject) {
    return this.model.create({ ...data, tenantId: this.tid });
  }
}
