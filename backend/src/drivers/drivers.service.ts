import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Driver, DriverDocument } from './driver.schema';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

@Injectable()
export class DriversService {
  constructor(@InjectModel(Driver.name) private driverModel: Model<DriverDocument>) {}

  async create(dto: CreateDriverDto): Promise<DriverDocument> {
    const existing = await this.driverModel.findOne({
      $or: [{ driverId: dto.driverId }, { licenseNumber: dto.licenseNumber }],
    });
    if (existing) {
      throw new ConflictException('A driver with this Driver ID or license number already exists.');
    }
    const created = new this.driverModel(dto);
    return created.save();
  }

  async findAll(search?: string): Promise<DriverDocument[]> {
    const query: any = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ driverName: regex }, { licenseNumber: regex }, { driverId: regex }];
    }
    return this.driverModel.find(query).sort({ driverName: 1 });
  }

  async findOne(id: string): Promise<DriverDocument> {
    const driver = await this.driverModel.findById(id);
    if (!driver) throw new NotFoundException('Driver not found.');
    return driver;
  }

  async update(id: string, dto: UpdateDriverDto): Promise<DriverDocument> {
    const driver = await this.findOne(id);
    Object.assign(driver, dto);
    return driver.save();
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const driver = await this.findOne(id);
    await driver.deleteOne();
    return { deleted: true };
  }

  // Used by the assignments flow to enforce that a driver with an expired
  // license can never be assigned to a trip.
  async assertAssignable(driverId: string): Promise<DriverDocument> {
    const driver = await this.findOne(driverId);
    if (!driver.isActive) {
      throw new BadRequestException('This driver is inactive and cannot be assigned.');
    }
    if (new Date(driver.licenseExpiry) < new Date()) {
      throw new BadRequestException('This driver\'s license has expired and cannot be assigned.');
    }
    return driver;
  }
}
