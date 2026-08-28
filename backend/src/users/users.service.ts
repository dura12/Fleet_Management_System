import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/roles.enum';

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
    const user = await this.userModel.findById(id).select('-passwordHash');
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async findByIdWithPassword(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async setPasswordHash(id: string, passwordHash: string): Promise<void> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found.');
    user.passwordHash = passwordHash;
    await user.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-passwordHash').sort({ fullName: 1 });
  }

  async update(id: string, dto: UpdateUserDto, actorRole: Role): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found.');

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const emailTaken = await this.userModel.findOne({ email: dto.email.toLowerCase(), _id: { $ne: id } });
      if (emailTaken) throw new ConflictException('A user with this email already exists.');
      user.email = dto.email.toLowerCase();
    }

    if (dto.employeeId && dto.employeeId !== user.employeeId) {
      const idTaken = await this.userModel.findOne({ employeeId: dto.employeeId, _id: { $ne: id } });
      if (idTaken) throw new ConflictException('A user with this employee ID already exists.');
      user.employeeId = dto.employeeId;
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.department !== undefined) user.department = dto.department;

    if (dto.role !== undefined) {
      if (actorRole !== Role.ADMIN) {
        throw new ForbiddenException('Only administrators can change user roles.');
      }
      user.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      if (actorRole !== Role.ADMIN) {
        throw new ForbiddenException('Only administrators can activate or deactivate users.');
      }
      user.isActive = dto.isActive;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await user.save();
    const sanitized = user.toObject();
    delete (sanitized as any).passwordHash;
    return sanitized as UserDocument;
  }

  async getSystemStats() {
    const [totalUsers, activeUsers, byRole] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
      this.userModel.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);
    const roleCounts = Object.fromEntries(byRole.map((r) => [r._id, r.count]));
    return { totalUsers, activeUsers, roleCounts };
  }
}
