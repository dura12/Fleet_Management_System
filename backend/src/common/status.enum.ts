export enum VehicleStatus {
  AVAILABLE = 'Available',
  ASSIGNED = 'Assigned',
  UNDER_MAINTENANCE = 'Under Maintenance',
  INACTIVE = 'Inactive',
}

export enum RequestStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  VEHICLE_ASSIGNED = 'Vehicle Assigned',
  COMPLETED = 'Completed',
}

// Defines which status transitions are legal. Enforced in the requests service
// so a request can never be pushed into an invalid state directly.
export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.DRAFT]: [RequestStatus.SUBMITTED],
  [RequestStatus.SUBMITTED]: [RequestStatus.APPROVED, RequestStatus.REJECTED],
  [RequestStatus.APPROVED]: [RequestStatus.VEHICLE_ASSIGNED],
  [RequestStatus.REJECTED]: [],
  [RequestStatus.VEHICLE_ASSIGNED]: [RequestStatus.COMPLETED],
  [RequestStatus.COMPLETED]: [],
};
