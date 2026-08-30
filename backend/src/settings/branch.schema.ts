import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BranchDocument = Branch & Document;

@Schema({ timestamps: true })
export class Branch {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);
