import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, VehicleDocument } from '../vehicles/vehicle.schema';
import { VehicleRequest, VehicleRequestDocument } from '../requests/vehicle-request.schema';
import { VehicleAssignment, VehicleAssignmentDocument } from '../assignments/vehicle-assignment.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    @InjectModel(VehicleRequest.name) private requestModel: Model<VehicleRequestDocument>,
    @InjectModel(VehicleAssignment.name) private assignmentModel: Model<VehicleAssignmentDocument>,
  ) {}

  // Report 1: Vehicle Register - full vehicle list with current status.
  async vehicleRegister() {
    return this.vehicleModel.find().sort({ vehicleId: 1 }).lean();
  }

  // Report 2: Requests by Status - counts + the requests themselves, grouped.
  async requestsByStatus() {
    const requests = await this.requestModel
      .find()
      .populate('requester', 'fullName department')
      .sort({ status: 1, createdAt: -1 })
      .lean();
    const grouped: Record<string, any[]> = {};
    for (const r of requests) {
      const status = r.status || 'Unknown';
      grouped[status] = grouped[status] || [];
      grouped[status].push(r);
    }
    return grouped;
  }

  async assignmentHistory() {
    return this.assignmentModel
      .find()
      .populate('vehicle', 'plateNumber model vehicleType seatingCapacity')
      .populate('driver', 'driverName licenseNumber')
      .populate({ path: 'request', select: 'requestNumber destination travelDate returnDate status requester priority branch', populate: { path: 'requester', select: 'fullName department' } })
      .sort({ assignmentDate: -1 })
      .lean();
  }
}
