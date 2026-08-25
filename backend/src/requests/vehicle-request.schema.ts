import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { RequestPriority, RequestStatus } from '../common/status.enum';

export type VehicleRequestDocument = VehicleRequest & Document;

@Schema({ timestamps: true })
export class VehicleRequest {
  @Prop({ required: true, unique: true, trim: true })
  requestNumber: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  requester: string;

  @Prop({ required: true, trim: true })
  destination: string;

  @Prop({ required: true, trim: true })
  purpose: string;

  @Prop({ required: true })
  travelDate: Date;

  @Prop({ required: true, min: 1, max: 50 })
  numberOfPassengers: number;

  @Prop({ required: true, enum: RequestPriority, default: RequestPriority.NORMAL })
  priority: RequestPriority;

  @Prop({ required: true, enum: RequestStatus, default: RequestStatus.DRAFT })
  status: RequestStatus;

  @Prop({ trim: true })
  rejectionReason?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  decidedBy?: string;

  @Prop()
  decidedAt?: Date;

  @Prop()
  submittedAt?: Date;

  @Prop()
  cancelledAt?: Date;
}

export const VehicleRequestSchema = SchemaFactory.createForClass(VehicleRequest);
