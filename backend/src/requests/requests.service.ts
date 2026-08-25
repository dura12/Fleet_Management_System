import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VehicleRequest, VehicleRequestDocument } from './vehicle-request.schema';
import { VehicleAssignment, VehicleAssignmentDocument } from '../assignments/vehicle-assignment.schema';
import {
  CreateRequestDto,
  UpdateRequestDto,
  AssignVehicleDto,
  ReassignDriverDto,
  ReassignVehicleDto,
  UpdateAssignmentNotesDto,
} from './dto/request.dto';
import {
  RequestStatus,
  RequestPriority,
  ALLOWED_TRANSITIONS,
  OVERDUE_HOURS,
} from '../common/status.enum';
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

  private async nextSequence(prefix: string, model: Model<any>): Promise<string> {
    const count = await model.countDocuments();
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  private dayBounds(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private isOverdue(request: { status: RequestStatus; submittedAt?: Date }): boolean {
    if (request.status !== RequestStatus.SUBMITTED || !request.submittedAt) return false;
    const hours = (Date.now() - new Date(request.submittedAt).getTime()) / (1000 * 60 * 60);
    return hours > OVERDUE_HOURS;
  }

  private async getOpenRequestCounts(): Promise<Map<string, number>> {
    const openStatuses = [RequestStatus.SUBMITTED, RequestStatus.APPROVED, RequestStatus.VEHICLE_ASSIGNED];
    const rows = await this.requestModel.aggregate([
      { $match: { status: { $in: openStatuses } } },
      { $group: { _id: '$requester', count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [String(r._id), r.count as number]));
  }

  private enrich(request: VehicleRequestDocument, openCounts: Map<string, number>) {
    const obj = request.toObject();
    obj.isOverdue = this.isOverdue(obj);
    const requesterId = String((obj.requester as any)?._id || obj.requester);
    obj.requesterOpenCount = openCounts.get(requesterId) || 0;
    return obj;
  }

  private sortQueue(requests: any[], role: Role) {
    const priorityRank = (p: RequestPriority) => (p === RequestPriority.URGENT ? 0 : 1);

    if (role === Role.MANAGER) {
      return requests.sort((a, b) => {
        if (a.status === RequestStatus.SUBMITTED && b.status !== RequestStatus.SUBMITTED) return -1;
        if (b.status === RequestStatus.SUBMITTED && a.status !== RequestStatus.SUBMITTED) return 1;
        if (a.isOverdue && !b.isOverdue) return -1;
        if (b.isOverdue && !a.isOverdue) return 1;
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime();
      });
    }

    if (role === Role.FLEET_COORDINATOR) {
      return requests.sort((a, b) => {
        if (a.status === RequestStatus.APPROVED && b.status !== RequestStatus.APPROVED) return -1;
        if (b.status === RequestStatus.APPROVED && a.status !== RequestStatus.APPROVED) return 1;
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return new Date(a.travelDate).getTime() - new Date(b.travelDate).getTime();
      });
    }

    if (role === Role.ADMIN) {
      return requests.sort(
        (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
      );
    }

    return requests.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private refId(ref: unknown): string {
    if (ref == null) {
      throw new BadRequestException('Missing linked record on assignment.');
    }
    if (typeof ref === 'string') return ref;
    if (typeof ref === 'object' && ref !== null && '_id' in ref) {
      return String((ref as { _id: unknown })._id);
    }
    return String(ref);
  }

  private async releaseAssignmentVehicle(assignment: VehicleAssignmentDocument) {
    await this.vehiclesService.markAvailable(this.refId(assignment.vehicle));
  }

  private async getBusyDriverIds(excludeRequestId?: string): Promise<Set<string>> {
    const assignments = await this.assignmentModel
      .find({ returnedAt: { $exists: false } })
      .populate('request', 'status');
    const busy = new Set<string>();
    for (const assignment of assignments) {
      const req = assignment.request as any;
      if (!req || req.status !== RequestStatus.VEHICLE_ASSIGNED) continue;
      if (excludeRequestId && String(req._id) === excludeRequestId) continue;
      busy.add(this.refId(assignment.driver));
    }
    return busy;
  }

  async getAssignOptions(requestId: string) {
    const request = await this.requestModel.findById(requestId);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    if (![RequestStatus.APPROVED, RequestStatus.VEHICLE_ASSIGNED].includes(request.status)) {
      return { vehicles: [], drivers: [] };
    }

    const vehicles = (await this.vehiclesService.findAll({ status: 'Available' })).filter(
      (v) => v.seatingCapacity == null || v.seatingCapacity >= request.numberOfPassengers,
    );
    const busyDriverIds = await this.getBusyDriverIds(requestId);
    const drivers = (await this.driversService.findAll()).filter(
      (d) =>
        d.isActive &&
        new Date(d.licenseExpiry) >= new Date() &&
        !busyDriverIds.has(String(d._id)),
    );

    return { vehicles, drivers };
  }

  private async assertNoEmployeeDateConflict(
    requesterId: string,
    travelDate: Date,
    excludeRequestId: string,
  ) {
    const { start, end } = this.dayBounds(travelDate);
    const conflict = await this.requestModel.findOne({
      _id: { $ne: excludeRequestId },
      requester: requesterId,
      status: { $in: [RequestStatus.APPROVED, RequestStatus.VEHICLE_ASSIGNED] },
      travelDate: { $gte: start, $lte: end },
    });
    if (conflict) {
      throw new BadRequestException(
        `This employee already has an active trip on that date (request ${conflict.requestNumber}).`,
      );
    }
  }

  private async assertNoVehicleDateConflict(
    vehicleId: string,
    travelDate: Date,
    excludeRequestId: string,
  ) {
    const { start, end } = this.dayBounds(travelDate);
    const assignments = await this.assignmentModel.find({ vehicle: vehicleId }).populate('request');
    for (const assignment of assignments) {
      if (assignment.returnedAt) continue;
      const req = assignment.request as any;
      if (!req || String(req._id) === excludeRequestId) continue;
      if (req.status !== RequestStatus.VEHICLE_ASSIGNED) continue;
      const reqDate = new Date(req.travelDate);
      if (reqDate >= start && reqDate <= end) {
        throw new BadRequestException(
          `This vehicle is already assigned to request ${req.requestNumber} on that date.`,
        );
      }
    }
  }

  async getQueueStats(user: AuthUser) {
    if (user.role === Role.ADMIN) {
      const [submitted, approved, assigned, completed, draft] = await Promise.all([
        this.requestModel.countDocuments({ status: RequestStatus.SUBMITTED }),
        this.requestModel.countDocuments({ status: RequestStatus.APPROVED }),
        this.requestModel.countDocuments({ status: RequestStatus.VEHICLE_ASSIGNED }),
        this.requestModel.countDocuments({ status: RequestStatus.COMPLETED }),
        this.requestModel.countDocuments({ status: RequestStatus.DRAFT }),
      ]);
      const submittedRows = await this.requestModel.find({ status: RequestStatus.SUBMITTED });
      return {
        submittedCount: submitted,
        overdueSubmitted: submittedRows.filter((r) => this.isOverdue(r)).length,
        awaitingAssignment: approved,
        activeTrips: assigned,
        completedTrips: completed,
        draftRequests: draft,
      };
    }
    if (user.role === Role.FLEET_COORDINATOR) {
      const awaitingAssignment = await this.requestModel.countDocuments({ status: RequestStatus.APPROVED });
      return { awaitingAssignment };
    }
    if (user.role === Role.MANAGER) {
      const submitted = await this.requestModel.find({ status: RequestStatus.SUBMITTED });
      return {
        submittedCount: submitted.length,
        overdueSubmitted: submitted.filter((r) => this.isOverdue(r)).length,
      };
    }
    return {};
  }

  async create(dto: CreateRequestDto, user: AuthUser): Promise<VehicleRequestDocument> {
    if (new Date(dto.travelDate) < new Date(new Date().toDateString())) {
      throw new BadRequestException('Travel date cannot be in the past.');
    }
    const requestNumber = await this.nextSequence('REQ', this.requestModel);
    const created = new this.requestModel({
      requestNumber,
      requester: user.userId,
      destination: dto.destination,
      purpose: dto.purpose,
      travelDate: dto.travelDate,
      numberOfPassengers: dto.numberOfPassengers,
      priority: dto.priority || RequestPriority.NORMAL,
      status: RequestStatus.DRAFT,
    });
    return created.save();
  }

  async findAll(user: AuthUser, filter: { status?: string; requester?: string; from?: string; to?: string }) {
    const query: any = {};
    if (user.role === Role.EMPLOYEE) {
      query.requester = user.userId;
    } else if (filter.requester) {
      query.requester = filter.requester;
    }
    if (filter.status) {
      query.status = filter.status;
    } else if (user.role !== Role.EMPLOYEE && user.role !== Role.ADMIN) {
      query.status = { $ne: RequestStatus.DRAFT };
    }
    if (filter.from || filter.to) {
      query.travelDate = {};
      if (filter.from) query.travelDate.$gte = new Date(filter.from);
      if (filter.to) query.travelDate.$lte = new Date(filter.to);
    }

    const openCounts = await this.getOpenRequestCounts();
    const rows = await this.requestModel
      .find(query)
      .populate('requester', 'fullName employeeId department')
      .sort({ createdAt: -1 });

    const enriched = rows.map((r) => this.enrich(r, openCounts));
    return this.sortQueue(enriched, user.role);
  }

  private async getRequestDocument(id: string, user: AuthUser): Promise<VehicleRequestDocument> {
    const request = await this.requestModel
      .findById(id)
      .populate('requester', 'fullName employeeId department');
    if (!request) throw new NotFoundException('Vehicle request not found.');
    if (user.role !== Role.ADMIN && user.role !== Role.EMPLOYEE && request.status === RequestStatus.DRAFT) {
      throw new NotFoundException('Vehicle request not found.');
    }
    if (user.role === Role.EMPLOYEE && String((request.requester as any)._id || request.requester) !== user.userId) {
      throw new ForbiddenException('You can only view your own requests.');
    }
    return request;
  }

  async findOne(id: string, user: AuthUser) {
    const request = await this.getRequestDocument(id, user);
    const openCounts = await this.getOpenRequestCounts();
    return this.enrich(request, openCounts);
  }

  async update(id: string, dto: UpdateRequestDto, user: AuthUser): Promise<VehicleRequestDocument> {
    const request = await this.getRequestDocument(id, user);
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
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    if (user.role === Role.EMPLOYEE && String(request.requester) !== user.userId) {
      throw new ForbiddenException('You can only submit your own requests.');
    }
    this.assertTransition(request.status, RequestStatus.SUBMITTED);
    request.status = RequestStatus.SUBMITTED;
    request.submittedAt = new Date();
    return request.save();
  }

  async cancel(id: string, user: AuthUser): Promise<VehicleRequestDocument | { deleted: boolean }> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');

    const requesterId = String((request.requester as any)?._id || request.requester);
    const isOwner = requesterId === user.userId;
    const isManager = user.role === Role.MANAGER;
    const isAdmin = user.role === Role.ADMIN;

    if ([RequestStatus.DRAFT, RequestStatus.SUBMITTED].includes(request.status)) {
      if (!isOwner && !isAdmin) throw new ForbiddenException('You can only cancel your own requests.');
      await request.deleteOne();
      return { deleted: true };
    }

    if ([RequestStatus.APPROVED, RequestStatus.VEHICLE_ASSIGNED].includes(request.status)) {
      if (!isOwner && !isManager && !isAdmin) {
        throw new ForbiddenException('Only the requester or a manager can cancel at this stage.');
      }
      this.assertTransition(request.status, RequestStatus.CANCELLED);

      if (request.status === RequestStatus.VEHICLE_ASSIGNED) {
        const assignment = await this.assignmentModel.findOne({ request: id });
        if (assignment) {
          await this.releaseAssignmentVehicle(assignment);
        }
      }

      request.status = RequestStatus.CANCELLED;
      request.cancelledAt = new Date();
      return request.save();
    }

    throw new BadRequestException('This request cannot be cancelled in its current status.');
  }

  async approve(id: string, user: AuthUser): Promise<VehicleRequestDocument> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    this.assertTransition(request.status, RequestStatus.APPROVED);
    await this.assertNoEmployeeDateConflict(
      String(request.requester),
      request.travelDate,
      String(request._id),
    );
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

  async assign(id: string, dto: AssignVehicleDto): Promise<VehicleRequestDocument> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    this.assertTransition(request.status, RequestStatus.VEHICLE_ASSIGNED);

    const vehicle = await this.vehiclesService.assertAssignable(dto.vehicleId, request.numberOfPassengers);
    await this.driversService.assertAssignable(dto.driverId);
    await this.assertDriverNotOnActiveTrip(dto.driverId, id);
    await this.assertNoVehicleDateConflict(dto.vehicleId, request.travelDate, id);

    const existingAssignment = await this.assignmentModel.findOne({ request: id });
    if (existingAssignment) {
      throw new BadRequestException('This request already has a vehicle assignment.');
    }

    const assignmentId = await this.nextSequence('ASG', this.assignmentModel);
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

  async reassignDriver(id: string, dto: ReassignDriverDto): Promise<VehicleAssignmentDocument> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    if (request.status !== RequestStatus.VEHICLE_ASSIGNED) {
      throw new BadRequestException('Driver can only be reassigned while the trip is in progress.');
    }

    const assignment = await this.assignmentModel.findOne({ request: id });
    if (!assignment) throw new BadRequestException('This request has no active assignment.');

    await this.driversService.assertAssignable(dto.driverId);
    await this.assertDriverNotOnActiveTrip(dto.driverId, id);
    assignment.driver = dto.driverId as any;
    return assignment.save();
  }

  async reassignVehicle(id: string, dto: ReassignVehicleDto): Promise<VehicleRequestDocument> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    if (request.status !== RequestStatus.VEHICLE_ASSIGNED) {
      throw new BadRequestException('Vehicle can only be reassigned while the trip is in progress.');
    }

    const assignment = await this.assignmentModel.findOne({ request: id });
    if (!assignment) throw new BadRequestException('This request has no active assignment.');

    const oldVehicleId = this.refId(assignment.vehicle);
    if (oldVehicleId === dto.vehicleId) {
      throw new BadRequestException('Select a different vehicle for reassignment.');
    }

    const vehicle = await this.vehiclesService.assertAssignable(dto.vehicleId, request.numberOfPassengers);
    await this.assertNoVehicleDateConflict(dto.vehicleId, request.travelDate, id);

    await this.vehiclesService.markUnderMaintenance(oldVehicleId);
    await this.vehiclesService.markAssigned(dto.vehicleId);
    assignment.vehicle = dto.vehicleId as any;
    await assignment.save();

    return request;
  }

  async updateAssignmentNotes(id: string, dto: UpdateAssignmentNotesDto): Promise<VehicleAssignmentDocument> {
    const assignment = await this.assignmentModel.findOne({ request: id });
    if (!assignment) throw new NotFoundException('Assignment not found for this request.');
    assignment.notes = dto.notes;
    return assignment.save();
  }

  async complete(id: string, notes?: string): Promise<VehicleRequestDocument> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    this.assertTransition(request.status, RequestStatus.COMPLETED);

    const assignment = await this.assignmentModel.findOne({ request: id });
    if (!assignment) {
      throw new BadRequestException('This request has no vehicle assignment to complete.');
    }
    assignment.returnedAt = new Date();
    if (notes !== undefined) assignment.notes = notes;
    await assignment.save();
    await this.releaseAssignmentVehicle(assignment);

    request.status = RequestStatus.COMPLETED;
    return request.save();
  }

  async overrideStatus(id: string, status: RequestStatus, user: AuthUser): Promise<VehicleRequestDocument> {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can override request status.');
    }
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');

    const previous = request.status;
    if (previous === status) return request;

    if (previous === RequestStatus.VEHICLE_ASSIGNED && status !== RequestStatus.COMPLETED) {
      const assignment = await this.assignmentModel.findOne({ request: id });
      if (assignment) await this.releaseAssignmentVehicle(assignment);
    }

    if (status === RequestStatus.COMPLETED && previous === RequestStatus.VEHICLE_ASSIGNED) {
      const assignment = await this.assignmentModel.findOne({ request: id });
      if (assignment) {
        assignment.returnedAt = new Date();
        await assignment.save();
        await this.releaseAssignmentVehicle(assignment);
      }
    }

    request.status = status;
    if (status === RequestStatus.SUBMITTED && !request.submittedAt) request.submittedAt = new Date();
    if (status === RequestStatus.CANCELLED) request.cancelledAt = new Date();
    return request.save();
  }

  private async assertDriverNotOnActiveTrip(driverId: string, excludeRequestId: string) {
    const busyDriverIds = await this.getBusyDriverIds(excludeRequestId);
    if (busyDriverIds.has(driverId)) {
      const assignment = await this.assignmentModel
        .findOne({ driver: driverId, returnedAt: { $exists: false } })
        .populate('request', 'requestNumber status');
      const req = assignment?.request as any;
      throw new BadRequestException(
        req?.requestNumber
          ? `This driver is already on active trip ${req.requestNumber}. Complete that trip first.`
          : 'This driver is already assigned to an active trip.',
      );
    }
  }

  async getAssignmentForRequest(id: string) {
    return this.assignmentModel
      .findOne({ request: id })
      .populate('vehicle')
      .populate('driver');
  }
}
