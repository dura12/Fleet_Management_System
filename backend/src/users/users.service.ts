import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const existing = await this.userModel.findOne({
      $or: [{ email: dto.email.toLowerCase() }, { employeeId: dto.employeeId }],
    });
    if (existing) {
      throw new ConflictException('A user with this email or employee ID already exists.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = new this.userModel({
      employeeId: dto.employeeId,
      fullName: dto.fullName,
      email: dto.email.toLowerCase(),
      department: dto.department,
      role: dto.role,
      passwordHash,
    });
    return created.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-passwordHash').sort({ fullName: 1 });
  }
}
