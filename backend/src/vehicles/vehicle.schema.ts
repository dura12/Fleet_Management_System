import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { VehicleStatus } from '../common/status.enum';

export type VehicleDocument = Vehicle & Document;

@Schema({ timestamps: true })
export class Vehicle {
  @Prop({ required: true, unique: true, trim: true })
  vehicleId: string;

  @Prop({ required: true, unique: true, trim: true })
  plateNumber: string;

  @Prop({ required: true, trim: true })
  model: string;

  @Prop({ required: true, trim: true })
  vehicleType: string;

  @Prop({ required: true, min: 0, default: 0 })
  currentMileage: number;

  @Prop({ required: true, enum: VehicleStatus, default: VehicleStatus.AVAILABLE })
  status: VehicleStatus;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
