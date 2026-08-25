import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DriverDocument = Driver & Document;

@Schema({ timestamps: true })
export class Driver {
  @Prop({ required: true, unique: true, trim: true })
  driverId: string;

  @Prop({ required: true, trim: true })
  driverName: string;

  @Prop({ trim: true })
  employeeId?: string;

  @Prop({ required: true, unique: true, trim: true })
  licenseNumber: string;

  @Prop({ required: true })
  licenseExpiry: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);
