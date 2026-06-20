import mongoose, { Document, Schema } from 'mongoose';

export type UserType = 'guest' | 'normal' | 'student' | 'premium';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  phone?: string;
  username?: string;
  passwordHash?: string;
  userType: UserType;
  isAdmin: boolean;
  nickname?: string;
  avatarUrl?: string;
  isGuest: boolean;
  guestToken?: string; // for guest JWT identity
  openid?: string; // 微信小程序遗留身份标识，迁移后保留以便后续接入微信登录时重新关联
  smsCode?: string;
  smsCodeExpiry?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    phone: { type: String, sparse: true },
    username: { type: String, sparse: true },
    passwordHash: { type: String },
    userType: {
      type: String,
      enum: ['guest', 'normal', 'student', 'premium'],
      default: 'normal',
    },
    isAdmin: { type: Boolean, default: false },
    nickname: { type: String },
    avatarUrl: { type: String },
    isGuest: { type: Boolean, default: false },
    guestToken: { type: String, sparse: true, index: true },
    openid: { type: String, sparse: true, index: true },
    smsCode: { type: String },
    smsCodeExpiry: { type: Date },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret['passwordHash'];
        delete ret['smsCode'];
        delete ret['smsCodeExpiry'];
        delete ret['guestToken'];
        delete ret['__v'];
        return ret;
      },
    },
  },
);

// Tenant-scoped uniqueness for phone and username
// Use partialFilterExpression instead of sparse so that guest users (null phone/username)
// are never included in the unique index — avoids duplicate-key errors for multiple guests.
userSchema.index(
  { tenantId: 1, phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } },
);
userSchema.index(
  { tenantId: 1, username: 1 },
  { unique: true, partialFilterExpression: { username: { $type: 'string' } } },
);
// 微信 openid 在租户内唯一 —— 保证迁移可重复执行（按 openid upsert）且不产生重复身份
userSchema.index(
  { tenantId: 1, openid: 1 },
  { unique: true, partialFilterExpression: { openid: { $type: 'string' } } },
);

export const User = mongoose.model<IUser>('User', userSchema);
