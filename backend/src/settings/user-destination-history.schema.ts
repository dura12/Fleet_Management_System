import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDestinationHistoryDocument = UserDestinationHistory & Document;

@Schema({ timestamps: true })
export class UserDestinationHistory {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, default: Date.now })
  lastUsedAt: Date;
}

export const UserDestinationHistorySchema = SchemaFactory.createForClass(UserDestinationHistory);
UserDestinationHistorySchema.index({ userId: 1, name: 1 }, { unique: true });
