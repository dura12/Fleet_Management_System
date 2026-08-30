import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema({ timestamps: true })
export class Department {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
