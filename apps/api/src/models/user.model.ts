import mongoose, { Document, Schema } from 'mongoose';

export type UserType = 'guest' | 'normal' | 'student' | 'premium';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  phone?: string;
  username?: string;
  passwordHash?: string;
  userType: UserType;
  isAdmin: boolean;
  nickname?: string;
  avatarUrl?: string;
  isGuest: boolean;
  guestToken?: string; // for guest JWT identity
  smsCode?: string;
  smsCodeExpiry?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, sparse: true, index: true },
    username: { type: String, sparse: true, index: true },
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
    smsCode: { type: String },
    smsCodeExpiry: { type: Date },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.smsCode;
        delete ret.smsCodeExpiry;
        delete ret.guestToken;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Ensure phone uniqueness when set
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });

export const User = mongoose.model<IUser>('User', userSchema);
