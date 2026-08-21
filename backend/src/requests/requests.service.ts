import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VehicleRequest, VehicleRequestDocument } from './vehicle-request.schema';
import { VehicleAssignment, VehicleAssignmentDocument } from '../assignments/vehicle-assignment.schema';
import { CreateRequestDto, UpdateRequestDto, AssignVehicleDto } from './dto/request.dto';
import { RequestStatus, ALLOWED_TRANSITIONS } from '../common/status.enum';
import { VehiclesService } from '../vehicles/vehicles.service';
import { DriversService } from '../drivers/drivers.service';
import { Role } from '../common/roles.enum';

interface AuthUser {
  userId: string;
  role: Role;
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(VehicleRequest.name) private requestModel: Model<VehicleRequestDocument>,
    @InjectModel(VehicleAssignment.name) private assignmentModel: Model<VehicleAssignmentDocument>,
    private vehiclesService: VehiclesService,
    private driversService: DriversService,
  ) {}

  private assertTransition(current: RequestStatus, next: RequestStatus) {
    const allowed = ALLOWED_TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Cannot move a request from "${current}" to "${next}".`);
    }
  }

  private async nextSequence(prefix: string, model: Model<any>, field: string): Promise<string> {
    const count = await model.countDocuments();
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(dto: CreateRequestDto, user: AuthUser): Promise<VehicleRequestDocument> {
    if (new Date(dto.travelDate) < new Date(new Date().toDateString())) {
      throw new BadRequestException('Travel date cannot be in the past.');
    }
    const requestNumber = await this.nextSequence('REQ', this.requestModel, 'requestNumber');
    const created = new this.requestModel({
      requestNumber,
      requester: user.userId,
      destination: dto.destination,
      purpose: dto.purpose,
      travelDate: dto.travelDate,
      numberOfPassengers: dto.numberOfPassengers,
      status: RequestStatus.DRAFT,
    });
    return created.save();
  }

  async findAll(user: AuthUser, filter: { status?: string; requester?: string; from?: string; to?: string }) {
    const query: any = {};
    // Employees only ever see their own requests; other roles see everything
    // (optionally narrowed further with the requester filter).
    if (user.role === Role.EMPLOYEE) {
      query.requester = user.userId;
    } else if (filter.requester) {
      query.requester = filter.requester;
    }
    if (filter.status) query.status = filter.status;
    if (filter.from || filter.to) {
      query.travelDate = {};
      if (filter.from) query.travelDate.$gte = new Date(filter.from);
      if (filter.to) query.travelDate.$lte = new Date(filter.to);
    }
    return this.requestModel
      .find(query)
      .populate('requester', 'fullName employeeId department')
      .sort({ createdAt: -1 });
  }

  async findOne(id: string, user: AuthUser): Promise<VehicleRequestDocument> {
    const request = await this.requestModel
      .findById(id)
      .populate('requester', 'fullName employeeId department');
    if (!request) throw new NotFoundException('Vehicle request not found.');
    if (user.role === Role.EMPLOYEE && String((request.requester as any)._id || request.requester) !== user.userId) {
      throw new ForbiddenException('You can only view your own requests.');
    }
    return request;
  }

  async update(id: string, dto: UpdateRequestDto, user: AuthUser): Promise<VehicleRequestDocument> {
    const request = await this.findOne(id, user);
    if (request.status !== RequestStatus.DRAFT) {
      throw new BadRequestException('Only requests still in Draft status can be edited.');
    }
    if (dto.travelDate && new Date(dto.travelDate) < new Date(new Date().toDateString())) {
      throw new BadRequestException('Travel date cannot be in the past.');
    }
    Object.assign(request, dto);
    return request.save();
  }

  async submit(id: string, user: AuthUser): Promise<VehicleRequestDocument> {
    const request = await this.findOne(id, user);
    this.assertTransition(request.status, RequestStatus.SUBMITTED);
    request.status = RequestStatus.SUBMITTED;
    return request.save();
  }

  async cancel(id: string, user: AuthUser): Promise<VehicleRequestDocument> {
    const request = await this.findOne(id, user);
    if (![RequestStatus.DRAFT, RequestStatus.SUBMITTED].includes(request.status)) {
      throw new BadRequestException('Only Draft or Submitted requests can be cancelled.');
    }
    await request.deleteOne();
    return request;
  }

  async approve(id: string, user: AuthUser): Promise<VehicleRequestDocument> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    this.assertTransition(request.status, RequestStatus.APPROVED);
    request.status = RequestStatus.APPROVED;
    request.decidedBy = user.userId as any;
    request.decidedAt = new Date();
    request.rejectionReason = undefined;
    return request.save();
  }

  async reject(id: string, reason: string | undefined, user: AuthUser): Promise<VehicleRequestDocument> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    this.assertTransition(request.status, RequestStatus.REJECTED);
    request.status = RequestStatus.REJECTED;
    request.decidedBy = user.userId as any;
    request.decidedAt = new Date();
    request.rejectionReason = reason;
    return request.save();
  }

  // FR-06/FR-07: assigns a vehicle + driver to an approved request. Rejects
  // vehicles under maintenance/inactive/already-assigned and drivers with an
  // expired license, then moves the request to "Vehicle Assigned".
  async assign(id: string, dto: AssignVehicleDto): Promise<VehicleRequestDocument> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    this.assertTransition(request.status, RequestStatus.VEHICLE_ASSIGNED);

    await this.vehiclesService.assertAssignable(dto.vehicleId);
    await this.driversService.assertAssignable(dto.driverId);

    const existingAssignment = await this.assignmentModel.findOne({ request: id });
    if (existingAssignment) {
      throw new BadRequestException('This request already has a vehicle assignment.');
    }

    const assignmentId = await this.nextSequence('ASG', this.assignmentModel, 'assignmentId');
    await this.assignmentModel.create({
      assignmentId,
      request: id,
      vehicle: dto.vehicleId,
      driver: dto.driverId,
      assignmentDate: new Date(),
    });

    await this.vehiclesService.markAssigned(dto.vehicleId);
    request.status = RequestStatus.VEHICLE_ASSIGNED;
    return request.save();
  }

  // Marks the trip complete and frees the vehicle back to Available (business rule 8).
  async complete(id: string): Promise<VehicleRequestDocument> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    this.assertTransition(request.status, RequestStatus.COMPLETED);

    const assignment = await this.assignmentModel.findOne({ request: id });
    if (!assignment) {
      throw new BadRequestException('This request has no vehicle assignment to complete.');
    }
    assignment.returnedAt = new Date();
    await assignment.save();
    await this.vehiclesService.markAvailable(assignment.vehicle as any);

    request.status = RequestStatus.COMPLETED;
    return request.save();
  }

  async getAssignmentForRequest(id: string) {
    return this.assignmentModel
      .findOne({ request: id })
      .populate('vehicle')
      .populate('driver');
  }
}
