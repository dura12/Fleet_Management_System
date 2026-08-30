import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { RequestPriority, RequestStatus } from '../common/status.enum';
import { TripDuration, inferTripDuration, computeExpectedReturn } from '../common/trip-duration';

export type VehicleRequestDocument = VehicleRequest & Document;

@Schema({ timestamps: true })
export class VehicleRequest {
  @Prop({ required: true, unique: true, trim: true })
  requestNumber: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  requester: string;

  @Prop({ required: true, trim: true })
  branch: string;

  @Prop({ required: true, trim: true })
  destination: string;

  @Prop({ required: true, trim: true })
  purpose: string;

  @Prop({ required: true })
  travelDate: Date;

  @Prop({ required: true })
  returnDate: Date;

  @Prop({ required: true, enum: ['2h', '4h', '1d', '2d', '3d', '1w'] })
  tripDuration: TripDuration;

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

VehicleRequestSchema.pre('validate', function (next) {
  const branch = this.branch?.trim();
  if (!branch || /^[a-f0-9]{24}$/i.test(branch)) {
    this.branch = 'Head Office';
  }
  if (!this.returnDate && this.travelDate) {
    const duration = this.tripDuration || '4h';
    this.returnDate = computeExpectedReturn(this.travelDate, duration);
  }
  if (!this.tripDuration) {
    if (this.travelDate && this.returnDate) {
      this.tripDuration = inferTripDuration(this.travelDate, this.returnDate);
    } else {
      this.tripDuration = '4h';
    }
  }
  next();
});
