import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, VehicleDocument } from './vehicle.schema';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { VehicleStatus } from '../common/status.enum';

@Injectable()
export class VehiclesService {
  constructor(@InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>) {}

  async create(dto: CreateVehicleDto): Promise<VehicleDocument> {
    const existing = await this.vehicleModel.findOne({
      $or: [{ vehicleId: dto.vehicleId }, { plateNumber: dto.plateNumber }],
    });
    if (existing) {
      throw new ConflictException('A vehicle with this Vehicle ID or plate number already exists.');
    }
    const created = new this.vehicleModel(dto);
    return created.save();
  }

  async findAll(filter: { status?: string; search?: string }): Promise<VehicleDocument[]> {
    const query: any = {};
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ plateNumber: regex }, { model: regex }, { vehicleId: regex }];
    }
    return this.vehicleModel.find(query).sort({ vehicleId: 1 });
  }

  async findOne(id: string): Promise<VehicleDocument> {
    const vehicle = await this.vehicleModel.findById(id);
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleDocument> {
    const vehicle = await this.findOne(id);
    if (dto.plateNumber && dto.plateNumber !== vehicle.plateNumber) {
      const clash = await this.vehicleModel.findOne({ plateNumber: dto.plateNumber });
      if (clash) throw new ConflictException('Plate number is already in use by another vehicle.');
    }
    if (dto.status && dto.status !== vehicle.status && vehicle.status === VehicleStatus.ASSIGNED) {
      throw new BadRequestException(
        'Cannot change status of an assigned vehicle directly. Use Reassign Vehicle on the active request.',
      );
    }
    Object.assign(vehicle, dto);
    return vehicle.save();
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const vehicle = await this.findOne(id);
    if (vehicle.status === VehicleStatus.ASSIGNED) {
      throw new BadRequestException('Cannot delete a vehicle that is currently assigned to a trip.');
    }
    await vehicle.deleteOne();
    return { deleted: true };
  }

  async assertAssignable(vehicleId: string, passengerCount?: number): Promise<VehicleDocument> {
    const vehicle = await this.findOne(vehicleId);
    if (vehicle.status === VehicleStatus.UNDER_MAINTENANCE) {
      throw new BadRequestException('This vehicle is under maintenance and cannot be assigned.');
    }
    if (vehicle.status === VehicleStatus.INACTIVE) {
      throw new BadRequestException('This vehicle is inactive and cannot be assigned.');
    }
    if (vehicle.status === VehicleStatus.ASSIGNED) {
      throw new BadRequestException('This vehicle is already assigned to another trip.');
    }
    if (passengerCount !== undefined && vehicle.seatingCapacity < passengerCount) {
      throw new BadRequestException(
        `This vehicle seats ${vehicle.seatingCapacity} but the request needs ${passengerCount} passengers.`,
      );
    }
    return vehicle;
  }

  async markAssigned(vehicleId: string) {
    await this.vehicleModel.findByIdAndUpdate(vehicleId, { status: VehicleStatus.ASSIGNED });
  }

  async markAvailable(vehicleId: string) {
    const vehicle = await this.vehicleModel.findByIdAndUpdate(
      vehicleId,
      { status: VehicleStatus.AVAILABLE },
      { new: true },
    );
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found when releasing assignment.`);
    }
    return vehicle;
  }

  async markUnderMaintenance(vehicleId: string) {
    await this.vehicleModel.findByIdAndUpdate(vehicleId, { status: VehicleStatus.UNDER_MAINTENANCE });
  }
}
