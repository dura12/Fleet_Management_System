import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DestinationDocument = Destination & Document;

@Schema({ timestamps: true })
export class Destination {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const DestinationSchema = SchemaFactory.createForClass(Destination);
