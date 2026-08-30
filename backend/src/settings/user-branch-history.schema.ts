import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserBranchHistoryDocument = UserBranchHistory & Document;

@Schema({ timestamps: true })
export class UserBranchHistory {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, default: Date.now })
  lastUsedAt: Date;
}

export const UserBranchHistorySchema = SchemaFactory.createForClass(UserBranchHistory);
UserBranchHistorySchema.index({ userId: 1, name: 1 }, { unique: true });
