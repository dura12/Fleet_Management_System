import 'reflect-metadata';

import * as mongoose from 'mongoose';

import * as bcrypt from 'bcryptjs';

import * as dotenv from 'dotenv';

import { UserSchema } from './users/user.schema';

import { VehicleSchema } from './vehicles/vehicle.schema';

import { DriverSchema } from './drivers/driver.schema';

import { VehicleRequestSchema } from './requests/vehicle-request.schema';

import { VehicleAssignmentSchema } from './assignments/vehicle-assignment.schema';

import { NotificationSchema } from './notifications/notification.schema';

import { BranchSchema } from './settings/branch.schema';

import { DepartmentSchema } from './settings/department.schema';

import { DestinationSchema } from './settings/destination.schema';

import { Role } from './common/roles.enum';

import { RequestPriority, RequestStatus, VehicleStatus } from './common/status.enum';
import { computeExpectedReturn } from './common/trip-duration';



dotenv.config();



const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleet_management';



async function seed() {

  await mongoose.connect(MONGODB_URI);

  console.log(`Connected to ${MONGODB_URI}`);



  const UserModel = mongoose.model('User', UserSchema);

  const VehicleModel = mongoose.model('Vehicle', VehicleSchema);

  const DriverModel = mongoose.model('Driver', DriverSchema);

  const RequestModel = mongoose.model('VehicleRequest', VehicleRequestSchema);

  const AssignmentModel = mongoose.model('VehicleAssignment', VehicleAssignmentSchema);

  const NotificationModel = mongoose.model('Notification', NotificationSchema);

  const BranchModel = mongoose.model('Branch', BranchSchema);

  const DepartmentModel = mongoose.model('Department', DepartmentSchema);

  const DestinationModel = mongoose.model('Destination', DestinationSchema);



  await Promise.all([

    AssignmentModel.deleteMany({}),

    RequestModel.deleteMany({}),

    NotificationModel.deleteMany({}),

    UserModel.deleteMany({}),

    VehicleModel.deleteMany({}),

    DriverModel.deleteMany({}),

    BranchModel.deleteMany({}),

    DepartmentModel.deleteMany({}),

    DestinationModel.deleteMany({}),

  ]);



  const password = await bcrypt.hash('Password123', 10);



  const [hqBranch, boleBranch] = await BranchModel.insertMany([

    { name: 'HQ', isActive: true },

    { name: 'Bole Office', isActive: true },

  ]);



  await DestinationModel.insertMany([

    { name: 'Gerji', isActive: true },

    { name: 'Robe', isActive: true },

    { name: 'Bole', isActive: true },

    { name: 'Northwind Facility', isActive: true },

  ]);



  await DepartmentModel.insertMany([

    { name: 'Business', isActive: true },

    { name: 'Development', isActive: true },

    { name: 'Project Management', isActive: true },

    { name: 'IT', isActive: true },

    { name: 'Sales', isActive: true },

    { name: 'Operations', isActive: true },

  ]);



  const [admin, employee, manager, coordinator] = await UserModel.insertMany([

    { employeeId: 'EMP-000', fullName: 'Admin User', email: 'admin@otech.com', passwordHash: password, department: 'IT', role: Role.ADMIN },

    { employeeId: 'EMP-001', fullName: 'Abebe Kebede', email: 'employee@otech.com', passwordHash: password, department: 'Sales', role: Role.EMPLOYEE, defaultBranch: hqBranch._id },

    { employeeId: 'EMP-002', fullName: 'Sara Tesfaye', email: 'manager@otech.com', passwordHash: password, department: 'Sales', role: Role.MANAGER, defaultBranch: hqBranch._id },

    { employeeId: 'EMP-003', fullName: 'Yonas Alemu', email: 'fleet@otech.com', passwordHash: password, department: 'Operations', role: Role.FLEET_COORDINATOR, defaultBranch: boleBranch._id },

  ]);



  const [van, sedan] = await VehicleModel.insertMany([

    { vehicleId: 'VEH-001', plateNumber: 'AA-12345', model: 'Toyota Hiace', vehicleType: 'Van', seatingCapacity: 14, currentMileage: 42000, status: VehicleStatus.AVAILABLE },

    { vehicleId: 'VEH-002', plateNumber: 'AA-54321', model: 'Toyota Corolla', vehicleType: 'Sedan', seatingCapacity: 4, currentMileage: 18500, status: VehicleStatus.AVAILABLE },

    { vehicleId: 'VEH-003', plateNumber: 'AA-98765', model: 'Isuzu FRR', vehicleType: 'Truck', seatingCapacity: 3, currentMileage: 91000, status: VehicleStatus.UNDER_MAINTENANCE },

  ]);



  const [driver1] = await DriverModel.insertMany([

    { driverId: 'DRV-001', driverName: 'Tesfaye Girma', licenseNumber: 'LIC-1001', licenseExpiry: new Date('2027-06-30'), isActive: true },

    { driverId: 'DRV-002', driverName: 'Meseret Alemayehu', licenseNumber: 'LIC-1002', licenseExpiry: new Date('2025-01-15'), isActive: true },

  ]);



  const travel = (daysFromNow: number, hours = 9, minutes = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const returnOn = (start: Date, extraDays: number, hours = 17, minutes = 0) => {
    const d = new Date(start);
    d.setDate(d.getDate() + extraDays);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };



  const draftStart = travel(5);

  const submittedStart = travel(7);

  const approvedStart = travel(10);

  const assignedStart = travel(14);

  const completedStart = travel(-3);



  const [draftReq, submittedReq, approvedReq, assignedReq, completedReq] = await RequestModel.insertMany([

    {

      requestNumber: 'REQ-0001',

      requester: employee._id,

      branch: 'HQ',

      destination: 'Bole bulbula',

      purpose: 'Site visit',

      travelDate: draftStart,

      returnDate: computeExpectedReturn(draftStart, '4h'),

      tripDuration: '4h',

      numberOfPassengers: 3,

      priority: RequestPriority.NORMAL,

      status: RequestStatus.DRAFT,

    },

    {

      requestNumber: 'REQ-0002',

      requester: employee._id,

      branch: 'HQ',

      destination: 'Gerji',

      purpose: 'Client meeting',

      travelDate: submittedStart,

      returnDate: computeExpectedReturn(submittedStart, '4h'),

      tripDuration: '4h',

      numberOfPassengers: 1,

      priority: RequestPriority.NORMAL,

      status: RequestStatus.SUBMITTED,

      submittedAt: new Date(),

    },

    {

      requestNumber: 'REQ-0003',

      requester: employee._id,

      branch: 'Bole Office',

      destination: 'Robe',

      purpose: 'Travel',

      travelDate: approvedStart,

      returnDate: computeExpectedReturn(approvedStart, '2d'),

      tripDuration: '2d',

      numberOfPassengers: 1,

      priority: RequestPriority.URGENT,

      status: RequestStatus.APPROVED,

      submittedAt: new Date(Date.now() - 86400000),

      decidedBy: manager._id,

      decidedAt: new Date(),

    },

    {

      requestNumber: 'REQ-0004',

      requester: employee._id,

      branch: 'HQ',

      destination: 'Northwind Facility',

      purpose: 'Equipment delivery',

      travelDate: assignedStart,

      returnDate: computeExpectedReturn(assignedStart, '2d'),

      tripDuration: '2d',

      numberOfPassengers: 2,

      priority: RequestPriority.NORMAL,

      status: RequestStatus.VEHICLE_ASSIGNED,

      submittedAt: new Date(Date.now() - 2 * 86400000),

      decidedBy: manager._id,

      decidedAt: new Date(Date.now() - 86400000),

    },

    {

      requestNumber: 'REQ-0005',

      requester: employee._id,

      branch: 'Bole Office',

      destination: 'Bole',

      purpose: 'Completed trip',

      travelDate: completedStart,

      returnDate: computeExpectedReturn(completedStart, '4h'),

      tripDuration: '4h',

      numberOfPassengers: 1,

      priority: RequestPriority.NORMAL,

      status: RequestStatus.COMPLETED,

      submittedAt: new Date(Date.now() - 10 * 86400000),

      decidedBy: manager._id,

      decidedAt: new Date(Date.now() - 9 * 86400000),

    },

  ]);



  await VehicleModel.findByIdAndUpdate(van._id, { status: VehicleStatus.ASSIGNED });



  await AssignmentModel.insertMany([

    {

      assignmentId: 'ASG-0001',

      request: assignedReq._id,

      vehicle: van._id,

      driver: driver1._id,

      assignmentDate: new Date(),

    },

    {

      assignmentId: 'ASG-0002',

      request: completedReq._id,

      vehicle: sedan._id,

      driver: driver1._id,

      assignmentDate: new Date(Date.now() - 8 * 86400000),

      returnedAt: new Date(Date.now() - 3 * 86400000),

    },

  ]);



  await NotificationModel.insertMany([

    {

      recipient: manager._id,

      type: 'REQUEST_SUBMITTED',

      title: 'New request submitted',

      message: 'Abebe Kebede submitted REQ-0002 for Gerji.',

      request: submittedReq._id,

      requestNumber: 'REQ-0002',

      readAt: null,

    },

    {

      recipient: coordinator._id,

      type: 'REQUEST_APPROVED',

      title: 'Ready for assignment',

      message: 'REQ-0003 to Robe was approved.',

      request: approvedReq._id,

      requestNumber: 'REQ-0003',

      readAt: null,

    },

    {

      recipient: admin._id,

      type: 'REQUEST_SUBMITTED',

      title: 'New request submitted',

      message: 'Abebe Kebede submitted REQ-0002 for Gerji.',

      request: submittedReq._id,

      requestNumber: 'REQ-0002',

      readAt: null,

    },

    {

      recipient: employee._id,

      type: 'REQUEST_APPROVED',

      title: 'Request approved',

      message: 'REQ-0003 was approved and is awaiting vehicle assignment.',

      request: approvedReq._id,

      requestNumber: 'REQ-0003',

      readAt: null,

    },

    {

      recipient: employee._id,

      type: 'REQUEST_ASSIGNED',

      title: 'Vehicle assigned',

      message: 'REQ-0004: AA-12345 (Toyota Hiace) has been assigned.',

      request: assignedReq._id,

      requestNumber: 'REQ-0004',

      readAt: null,

    },

    {

      recipient: employee._id,

      type: 'REQUEST_COMPLETED',

      title: 'Trip completed',

      message: 'REQ-0005 has been marked completed.',

      request: completedReq._id,

      requestNumber: 'REQ-0005',

      readAt: new Date(Date.now() - 2 * 86400000),

    },

  ]);



  console.log('Seed complete. Demo accounts (password: Password123):');

  console.log('  admin@otech.com      (Administrator)');

  console.log('  employee@otech.com   (Employee) — 5 sample requests');

  console.log('  manager@otech.com    (Manager)');

  console.log('  fleet@otech.com      (Fleet Coordinator)');

  console.log('Note: Re-running seed clears ALL users, vehicles, drivers, requests, assignments, branches, departments, destinations, and notifications.');

  console.log('Note: DRV-002 has an expired license on purpose, to demonstrate the assignment validation.');



  await mongoose.disconnect();

}



seed().catch((err) => {

  console.error('Seed failed:', err);

  process.exit(1);

});


