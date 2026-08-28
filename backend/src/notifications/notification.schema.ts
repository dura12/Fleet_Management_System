import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  REQUEST_SUBMITTED = 'REQUEST_SUBMITTED',
  REQUEST_APPROVED = 'REQUEST_APPROVED',
  REQUEST_REJECTED = 'REQUEST_REJECTED',
  REQUEST_ASSIGNED = 'REQUEST_ASSIGNED',
  REQUEST_COMPLETED = 'REQUEST_COMPLETED',
  REQUEST_CANCELLED = 'REQUEST_CANCELLED',
  STATUS_OVERRIDE = 'STATUS_OVERRIDE',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipient: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'VehicleRequest' })
  request?: Types.ObjectId;

  @Prop({ trim: true })
  requestNumber?: string;

  @Prop({ type: Date, default: null })
  readAt?: Date | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
