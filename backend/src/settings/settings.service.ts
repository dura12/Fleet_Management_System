import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branch, BranchDocument } from './branch.schema';
import { Department, DepartmentDocument } from './department.schema';
import { Destination, DestinationDocument } from './destination.schema';
import { UserDestinationHistory, UserDestinationHistoryDocument } from './user-destination-history.schema';
import { UserBranchHistory, UserBranchHistoryDocument } from './user-branch-history.schema';
import { CreateLookupDto, UpdateLookupDto } from './dto/lookup.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
    @InjectModel(Destination.name) private destinationModel: Model<DestinationDocument>,
    @InjectModel(UserDestinationHistory.name)
    private destinationHistoryModel: Model<UserDestinationHistoryDocument>,
    @InjectModel(UserBranchHistory.name)
    private branchHistoryModel: Model<UserBranchHistoryDocument>,
  ) {}

  async findAllBranches(activeOnly = false): Promise<BranchDocument[]> {
    const query: Record<string, unknown> = {};
    if (activeOnly) query.isActive = true;
    return this.branchModel.find(query).sort({ name: 1 });
  }

  async createBranch(dto: CreateLookupDto): Promise<BranchDocument> {
    const existing = await this.branchModel.findOne({ name: dto.name.trim() });
    if (existing) throw new ConflictException('A branch with this name already exists.');
    return new this.branchModel({ name: dto.name.trim() }).save();
  }

  async updateBranch(id: string, dto: UpdateLookupDto): Promise<BranchDocument> {
    const branch = await this.branchModel.findById(id);
    if (!branch) throw new NotFoundException('Branch not found.');
    if (dto.name && dto.name.trim() !== branch.name) {
      const clash = await this.branchModel.findOne({ name: dto.name.trim(), _id: { $ne: id } });
      if (clash) throw new ConflictException('A branch with this name already exists.');
      branch.name = dto.name.trim();
    }
    if (dto.isActive !== undefined) branch.isActive = dto.isActive;
    return branch.save();
  }

  async findAllDepartments(activeOnly = false): Promise<DepartmentDocument[]> {
    const query: Record<string, unknown> = {};
    if (activeOnly) query.isActive = true;
    return this.departmentModel.find(query).sort({ name: 1 });
  }

  async createDepartment(dto: CreateLookupDto): Promise<DepartmentDocument> {
    const existing = await this.departmentModel.findOne({ name: dto.name.trim() });
    if (existing) throw new ConflictException('A department with this name already exists.');
    return new this.departmentModel({ name: dto.name.trim() }).save();
  }

  async updateDepartment(id: string, dto: UpdateLookupDto): Promise<DepartmentDocument> {
    const department = await this.departmentModel.findById(id);
    if (!department) throw new NotFoundException('Department not found.');
    if (dto.name && dto.name.trim() !== department.name) {
      const clash = await this.departmentModel.findOne({ name: dto.name.trim(), _id: { $ne: id } });
      if (clash) throw new ConflictException('A department with this name already exists.');
      department.name = dto.name.trim();
    }
    if (dto.isActive !== undefined) department.isActive = dto.isActive;
    return department.save();
  }

  async findAllDestinations(activeOnly = false): Promise<DestinationDocument[]> {
    const query: Record<string, unknown> = {};
    if (activeOnly) query.isActive = true;
    return this.destinationModel.find(query).sort({ name: 1 });
  }

  async createDestination(dto: CreateLookupDto): Promise<DestinationDocument> {
    const existing = await this.destinationModel.findOne({ name: dto.name.trim() });
    if (existing) throw new ConflictException('A destination with this name already exists.');
    return new this.destinationModel({ name: dto.name.trim() }).save();
  }

  async updateDestination(id: string, dto: UpdateLookupDto): Promise<DestinationDocument> {
    const destination = await this.destinationModel.findById(id);
    if (!destination) throw new NotFoundException('Destination not found.');
    if (dto.name && dto.name.trim() !== destination.name) {
      const clash = await this.destinationModel.findOne({ name: dto.name.trim(), _id: { $ne: id } });
      if (clash) throw new ConflictException('A destination with this name already exists.');
      destination.name = dto.name.trim();
    }
    if (dto.isActive !== undefined) destination.isActive = dto.isActive;
    return destination.save();
  }

  async recordUserDestination(userId: string, destinationName: string): Promise<void> {
    const name = destinationName.trim();
    if (!name) return;

    const adminMatch = await this.destinationModel.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (adminMatch) return;

    await this.destinationHistoryModel.findOneAndUpdate(
      { userId, name },
      { lastUsedAt: new Date() },
      { upsert: true, new: true },
    );
  }

  async recordUserBranch(userId: string, branchName: string): Promise<void> {
    const name = branchName.trim();
    if (!name) return;

    const adminMatch = await this.branchModel.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (adminMatch) return;

    await this.branchHistoryModel.findOneAndUpdate(
      { userId, name },
      { lastUsedAt: new Date() },
      { upsert: true, new: true },
    );
  }

  private mergeLookupNames(
    adminItems: { name: string }[],
    historyItems: { name: string }[],
  ): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of adminItems) {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item.name);
      }
    }
    for (const item of historyItems) {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item.name);
      }
    }
    return result;
  }

  async getBranchNamesForUser(userId: string): Promise<string[]> {
    const [adminBranches, history] = await Promise.all([
      this.branchModel.find({ isActive: true }).sort({ name: 1 }),
      this.branchHistoryModel.find({ userId }).sort({ lastUsedAt: -1 }),
    ]);
    return this.mergeLookupNames(adminBranches, history);
  }

  async getDestinationNamesForUser(userId: string): Promise<string[]> {
    const [adminDests, history] = await Promise.all([
      this.destinationModel.find({ isActive: true }).sort({ name: 1 }),
      this.destinationHistoryModel.find({ userId }).sort({ lastUsedAt: -1 }),
    ]);
    return this.mergeLookupNames(adminDests, history);
  }

  async assertActiveBranch(id: string): Promise<BranchDocument> {
    const branch = await this.branchModel.findById(id);
    if (!branch) throw new NotFoundException('Branch not found.');
    if (!branch.isActive) throw new NotFoundException('Branch is inactive.');
    return branch;
  }
}
