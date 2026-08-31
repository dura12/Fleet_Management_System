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
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.schema';
import { Role } from '../common/roles.enum';
import { computeExpectedReturn, inferTripDuration } from '../common/trip-duration';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';

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
    private notificationsService: NotificationsService,
    private settingsService: SettingsService,
    private usersService: UsersService,
  ) {}

  private assertTransition(current: RequestStatus, next: RequestStatus) {
    const allowed = ALLOWED_TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Cannot move a request from "${current}" to "${next}".`);
    }
  }

  private assertCanComplete(request: VehicleRequestDocument) {
    if (new Date() < new Date(request.travelDate)) {
      throw new BadRequestException(
        'This trip cannot be completed before its scheduled departure. Cancel the trip if it will not run.',
      );
    }
  }

  private canCoordinatorCancelAssigned(request: VehicleRequestDocument, role: Role): boolean {
    return (
      role === Role.FLEET_COORDINATOR &&
      request.status === RequestStatus.VEHICLE_ASSIGNED &&
      new Date() < new Date(request.travelDate)
    );
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

  private validateTravelDates(travelDate: string, returnDate: string) {
    const start = new Date(travelDate);
    const end = new Date(returnDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Travel and return date/time must be valid.');
    }
    if (start < new Date()) {
      throw new BadRequestException('Travel date and time cannot be in the past.');
    }
    if (end < start) {
      throw new BadRequestException('Return date and time cannot be before travel date and time.');
    }
  }

  private async resolveStartLocation(branch: string | undefined, userId: string): Promise<string> {
    const trimmed = branch?.trim();
    if (trimmed) return trimmed;

    const user = await this.usersService.findById(userId);
    const defaultBranch = user.defaultBranch as any;
    const defaultName = defaultBranch?.name || defaultBranch;
    if (defaultName && typeof defaultName === 'string') return defaultName;

    throw new BadRequestException('Please enter a start location.');
  }

  private async saveLookupHistory(userId: string, branch: string, destination: string) {
    await Promise.all([
      this.settingsService.recordUserBranch(userId, branch),
      this.settingsService.recordUserDestination(userId, destination),
    ]);
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

  private ensureLegacyRequestFields(request: VehicleRequestDocument) {
    const branch = request.branch?.trim();
    if (!branch || /^[a-f0-9]{24}$/i.test(branch)) {
      request.branch = 'Head Office';
    }
    if (!request.returnDate && request.travelDate) {
      const duration = request.tripDuration || '4h';
      request.returnDate = computeExpectedReturn(request.travelDate, duration);
    }
    if (!request.tripDuration) {
      if (request.travelDate && request.returnDate) {
        request.tripDuration = inferTripDuration(request.travelDate, request.returnDate);
      } else {
        request.tripDuration = '4h';
      }
    }
  }

  /** Fix requests left in Approved/Assigned after a partial assign or complete. */
  private async repairStaleRequestStates() {
    try {
      const approved = await this.requestModel.find({ status: RequestStatus.APPROVED });
      for (const request of approved) {
        const assignment = await this.assignmentModel.findOne({
          request: request._id,
          returnedAt: { $exists: false },
        });
        if (!assignment) continue;
        this.ensureLegacyRequestFields(request);
        request.status = RequestStatus.VEHICLE_ASSIGNED;
        await request.save();
      }

      const assigned = await this.requestModel.find({ status: RequestStatus.VEHICLE_ASSIGNED });
      for (const request of assigned) {
        const assignment = await this.assignmentModel.findOne({
          request: request._id,
          returnedAt: { $exists: true },
        });
        if (!assignment) continue;
        this.ensureLegacyRequestFields(request);
        request.status = RequestStatus.COMPLETED;
        await request.save();
      }
    } catch {
      // Best-effort repair; do not block listing requests.
    }
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
    travelDate: Date | string,
    returnDate: Date | string,
    excludeRequestId: string,
    forEmployee = false,
  ) {
    const start = new Date(travelDate);
    const end = new Date(returnDate);
    const conflict = await this.requestModel.findOne({
      _id: { $ne: excludeRequestId },
      requester: requesterId,
      status: {
        $in: [RequestStatus.SUBMITTED, RequestStatus.APPROVED, RequestStatus.VEHICLE_ASSIGNED],
      },
      travelDate: { $lte: end },
      returnDate: { $gte: start },
    });
    if (conflict) {
      const message = forEmployee
        ? `You already have a request overlapping those dates (${conflict.requestNumber}). Adjust your dates or cancel the other request first.`
        : `This employee already has a request overlapping those dates (${conflict.requestNumber}).`;
      throw new BadRequestException(message);
    }
  }

  private async assertNoVehicleDateConflict(
    vehicleId: string,
    travelDate: Date | string,
    returnDate: Date | string,
    excludeRequestId: string,
  ) {
    const start = new Date(travelDate);
    const end = new Date(returnDate);
    const assignments = await this.assignmentModel.find({ vehicle: vehicleId }).populate('request');
    for (const assignment of assignments) {
      if (assignment.returnedAt) continue;
      const req = assignment.request as any;
      if (!req || String(req._id) === excludeRequestId) continue;
      if (req.status !== RequestStatus.VEHICLE_ASSIGNED) continue;
      const reqStart = new Date(req.travelDate);
      const reqEnd = new Date(req.returnDate || req.travelDate);
      if (start <= reqEnd && reqStart <= end) {
        throw new BadRequestException(
          `This vehicle is already assigned to request ${req.requestNumber} during those dates.`,
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
    const returnDate = computeExpectedReturn(dto.travelDate, dto.tripDuration);
    this.validateTravelDates(dto.travelDate, returnDate.toISOString());
    const branch = await this.resolveStartLocation(dto.branch, user.userId);
    const requestNumber = await this.nextSequence('REQ', this.requestModel);
    const created = new this.requestModel({
      requestNumber,
      requester: user.userId,
      branch,
      destination: dto.destination.trim(),
      purpose: dto.purpose.trim(),
      travelDate: dto.travelDate,
      returnDate,
      tripDuration: dto.tripDuration,
      numberOfPassengers: dto.numberOfPassengers,
      priority: dto.priority || RequestPriority.NORMAL,
      status: RequestStatus.DRAFT,
    });
    const saved = await created.save();
    await this.saveLookupHistory(user.userId, branch, dto.destination);
    return saved;
  }

  async getFormSuggestions(userId: string) {
    const [startLocations, destinations, user] = await Promise.all([
      this.settingsService.getBranchNamesForUser(userId),
      this.settingsService.getDestinationNamesForUser(userId),
      this.usersService.findById(userId),
    ]);
    const purposeRows = await this.requestModel
      .find({ requester: userId, purpose: { $exists: true, $ne: '' } })
      .distinct('purpose');
    const purposes = [...new Set(purposeRows.map((p: string) => p.trim()).filter(Boolean))].sort();
    const defaultBranch = (user.defaultBranch as any)?.name || '';
    return { startLocations, destinations, purposes, defaultBranch };
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

    if ([Role.FLEET_COORDINATOR, Role.MANAGER, Role.ADMIN].includes(user.role)) {
      await this.repairStaleRequestStates();
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

    const travelDate = dto.travelDate ?? request.travelDate;
    const tripDuration = dto.tripDuration ?? request.tripDuration ?? inferTripDuration(travelDate, request.returnDate);
    const returnDate = computeExpectedReturn(travelDate, tripDuration);
    this.validateTravelDates(
      new Date(travelDate).toISOString(),
      returnDate.toISOString(),
    );

    if (dto.branch !== undefined) {
      dto.branch = dto.branch.trim();
      if (!dto.branch) throw new BadRequestException('Start location cannot be empty.');
    }

    Object.assign(request, dto);
    request.returnDate = returnDate;
    request.tripDuration = tripDuration;
    const saved = await request.save();
    if (dto.branch || dto.destination) {
      await this.saveLookupHistory(
        user.userId,
        saved.branch,
        saved.destination,
      );
    }
    return saved;
  }

  async submit(id: string, user: AuthUser): Promise<VehicleRequestDocument> {
    const request = await this.requestModel.findById(id).populate('requester', 'fullName');
    if (!request) throw new NotFoundException('Vehicle request not found.');
    if (user.role === Role.EMPLOYEE && String((request.requester as any)._id || request.requester) !== user.userId) {
      throw new ForbiddenException('You can only submit your own requests.');
    }
    this.assertTransition(request.status, RequestStatus.SUBMITTED);
    await this.assertNoEmployeeDateConflict(
      String((request.requester as any)._id || request.requester),
      request.travelDate,
      request.returnDate || request.travelDate,
      String(request._id),
      user.role === Role.EMPLOYEE,
    );
    request.status = RequestStatus.SUBMITTED;
    request.submittedAt = new Date();
    this.ensureLegacyRequestFields(request);
    const saved = await request.save();

    const requesterName = (request.requester as any)?.fullName || 'An employee';
    await this.safeNotify(() =>
      this.notificationsService.notifyRoles(
        [Role.MANAGER, Role.ADMIN],
        {
          type: NotificationType.REQUEST_SUBMITTED,
          title: 'New request submitted',
          message: `${requesterName} submitted ${request.requestNumber} for ${request.destination}.`,
          requestId: String(request._id),
          requestNumber: request.requestNumber,
        },
        user.userId,
      ),
    );

    return saved;
  }

  async cancel(id: string, user: AuthUser): Promise<VehicleRequestDocument | { deleted: boolean }> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');

    const requesterId = String((request.requester as any)?._id || request.requester);
    const isOwner = requesterId === user.userId;
    const isManager = user.role === Role.MANAGER;
    const isAdmin = user.role === Role.ADMIN;
    const requestNumber = request.requestNumber;
    const previousStatus = request.status;

    if ([RequestStatus.DRAFT, RequestStatus.SUBMITTED].includes(request.status)) {
      if (!isOwner && !isAdmin) throw new ForbiddenException('You can only cancel your own requests.');
      await request.deleteOne();

      if (previousStatus === RequestStatus.SUBMITTED) {
        await this.safeNotify(() =>
          this.notificationsService.notifyRoles(
            [Role.MANAGER, Role.ADMIN],
            {
              type: NotificationType.REQUEST_CANCELLED,
              title: 'Request withdrawn',
              message: `${requestNumber} was cancelled before approval.`,
              requestNumber,
            },
            user.userId,
          ),
        );
      }

      return { deleted: true };
    }

    if ([RequestStatus.APPROVED, RequestStatus.VEHICLE_ASSIGNED].includes(request.status)) {
      const coordinatorCancelAssigned = this.canCoordinatorCancelAssigned(request, user.role);
      if (!isOwner && !isManager && !isAdmin && !coordinatorCancelAssigned) {
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
      const saved = await request.save();

      const recipients: string[] = [];
      if (!isOwner) recipients.push(requesterId);
      const staffIds = await this.notificationsService.findUserIdsByRoles([
        Role.MANAGER,
        Role.FLEET_COORDINATOR,
        Role.ADMIN,
      ]);
      for (const sid of staffIds) {
        if (sid !== user.userId) recipients.push(sid);
      }
      await this.safeNotify(() =>
        this.notificationsService.createMany({
          recipientIds: recipients,
          type: NotificationType.REQUEST_CANCELLED,
          title: 'Request cancelled',
          message: `${requestNumber} was cancelled.`,
          requestId: String(request._id),
          requestNumber,
        }),
      );

      return saved;
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
      request.returnDate || request.travelDate,
      String(request._id),
    );
    request.status = RequestStatus.APPROVED;
    request.decidedBy = user.userId as any;
    request.decidedAt = new Date();
    request.rejectionReason = undefined;
    this.ensureLegacyRequestFields(request);
    const saved = await request.save();

    const requesterId = String(request.requester);
    await this.safeNotify(async () => {
      await this.notificationsService.createMany({
        recipientIds: [requesterId],
        type: NotificationType.REQUEST_APPROVED,
        title: 'Request approved',
        message: `${request.requestNumber} was approved and is awaiting vehicle assignment.`,
        requestId: String(request._id),
        requestNumber: request.requestNumber,
      });
      await this.notificationsService.notifyRoles(
        [Role.FLEET_COORDINATOR, Role.ADMIN],
        {
          type: NotificationType.REQUEST_APPROVED,
          title: 'Ready for assignment',
          message: `${request.requestNumber} to ${request.destination} was approved.`,
          requestId: String(request._id),
          requestNumber: request.requestNumber,
        },
        user.userId,
      );
    });

    return saved;
  }

  async reject(id: string, reason: string | undefined, user: AuthUser): Promise<VehicleRequestDocument> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    this.assertTransition(request.status, RequestStatus.REJECTED);
    request.status = RequestStatus.REJECTED;
    request.decidedBy = user.userId as any;
    request.decidedAt = new Date();
    request.rejectionReason = reason;
    this.ensureLegacyRequestFields(request);
    const saved = await request.save();

    const reasonText = reason ? ` Reason: ${reason}` : '';
    await this.safeNotify(() =>
      this.notificationsService.createMany({
        recipientIds: [String(request.requester)],
        type: NotificationType.REQUEST_REJECTED,
        title: 'Request rejected',
        message: `${request.requestNumber} was rejected.${reasonText}`,
        requestId: String(request._id),
        requestNumber: request.requestNumber,
      }),
    );

    return saved;
  }

  async assign(id: string, dto: AssignVehicleDto): Promise<VehicleRequestDocument> {
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Vehicle request not found.');
    this.assertTransition(request.status, RequestStatus.VEHICLE_ASSIGNED);
    this.ensureLegacyRequestFields(request);

    const existingAssignment = await this.assignmentModel.findOne({ request: id });
    if (existingAssignment) {
      if (!existingAssignment.returnedAt && request.status === RequestStatus.APPROVED) {
        request.status = RequestStatus.VEHICLE_ASSIGNED;
        return request.save();
      }
      throw new BadRequestException('This request already has a vehicle assignment.');
    }

    const vehicle = await this.vehiclesService.assertAssignable(dto.vehicleId, request.numberOfPassengers);
    await this.driversService.assertAssignable(dto.driverId);
    await this.assertDriverNotOnActiveTrip(dto.driverId, id);
    await this.assertNoVehicleDateConflict(
      dto.vehicleId,
      request.travelDate,
      request.returnDate || request.travelDate,
      id,
    );

    const assignmentId = await this.nextSequence('ASG', this.assignmentModel);
    let createdAssignment: VehicleAssignmentDocument | null = null;
    try {
      createdAssignment = await this.assignmentModel.create({
        assignmentId,
        request: id,
        vehicle: dto.vehicleId,
        driver: dto.driverId,
        assignmentDate: new Date(),
      });

      await this.vehiclesService.markAssigned(dto.vehicleId);
      request.status = RequestStatus.VEHICLE_ASSIGNED;
      const saved = await request.save();

      await this.safeNotify(() =>
        this.notificationsService.createMany({
          recipientIds: [String(request.requester)],
          type: NotificationType.REQUEST_ASSIGNED,
          title: 'Vehicle assigned',
          message: `${request.requestNumber}: ${vehicle.plateNumber} (${vehicle.model}) has been assigned.`,
          requestId: String(request._id),
          requestNumber: request.requestNumber,
        }),
      );

      return saved;
    } catch (err) {
      if (createdAssignment) {
        await this.assignmentModel.findByIdAndDelete(createdAssignment._id);
        await this.vehiclesService.markAvailable(dto.vehicleId);
      }
      throw err;
    }
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
    await this.assertNoVehicleDateConflict(
      dto.vehicleId,
      request.travelDate,
      request.returnDate || request.travelDate,
      id,
    );

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
    this.ensureLegacyRequestFields(request);
    this.assertCanComplete(request);

    const assignment = await this.assignmentModel.findOne({ request: id });
    if (!assignment) {
      throw new BadRequestException('This request has no vehicle assignment to complete.');
    }

    if (assignment.returnedAt) {
      request.status = RequestStatus.COMPLETED;
      return request.save();
    }

    assignment.returnedAt = new Date();
    if (notes !== undefined) assignment.notes = notes;
    await assignment.save();
    await this.releaseAssignmentVehicle(assignment);

    request.status = RequestStatus.COMPLETED;
    const saved = await request.save();

    await this.safeNotify(() =>
      this.notificationsService.createMany({
        recipientIds: [String(request.requester)],
        type: NotificationType.REQUEST_COMPLETED,
        title: 'Trip completed',
        message: `${request.requestNumber} has been marked completed.`,
        requestId: String(request._id),
        requestNumber: request.requestNumber,
      }),
    );

    return saved;
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
    const saved = await request.save();

    await this.safeNotify(() =>
      this.notificationsService.createMany({
        recipientIds: [String(request.requester)],
        type: NotificationType.STATUS_OVERRIDE,
        title: 'Request status updated',
        message: `${request.requestNumber} status was changed to ${status} by an administrator.`,
        requestId: String(request._id),
        requestNumber: request.requestNumber,
      }),
    );

    return saved;
  }

  private async safeNotify(fn: () => Promise<void>) {
    try {
      await fn();
    } catch {
      // Notification failures must not block the request workflow.
    }
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
