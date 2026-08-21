import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type VehicleAssignmentDocument = VehicleAssignment & Document;

@Schema({ timestamps: true })
export class VehicleAssignment {
  @Prop({ required: true, unique: true, trim: true })
  assignmentId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'VehicleRequest', required: true, unique: true })
  request: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Vehicle', required: true })
  vehicle: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Driver', required: true })
  driver: string;

  @Prop({ required: true, default: Date.now })
  assignmentDate: Date;

  @Prop()
  returnedAt?: Date;
}

export const VehicleAssignmentSchema = SchemaFactory.createForClass(VehicleAssignment);
