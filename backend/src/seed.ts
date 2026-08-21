import 'reflect-metadata';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { UserSchema } from './users/user.schema';
import { VehicleSchema } from './vehicles/vehicle.schema';
import { DriverSchema } from './drivers/driver.schema';
import { Role } from './common/roles.enum';
import { VehicleStatus } from './common/status.enum';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleet_management';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${MONGODB_URI}`);

  const UserModel = mongoose.model('User', UserSchema);
  const VehicleModel = mongoose.model('Vehicle', VehicleSchema);
  const DriverModel = mongoose.model('Driver', DriverSchema);

  await Promise.all([UserModel.deleteMany({}), VehicleModel.deleteMany({}), DriverModel.deleteMany({})]);

  const password = await bcrypt.hash('Password123', 10);

  await UserModel.insertMany([
    { employeeId: 'EMP-001', fullName: 'Abebe Kebede', email: 'employee@otech.com', passwordHash: password, department: 'Sales', role: Role.EMPLOYEE },
    { employeeId: 'EMP-002', fullName: 'Sara Tesfaye', email: 'manager@otech.com', passwordHash: password, department: 'Sales', role: Role.MANAGER },
    { employeeId: 'EMP-003', fullName: 'Yonas Alemu', email: 'fleet@otech.com', passwordHash: password, department: 'Operations', role: Role.FLEET_COORDINATOR },
  ]);

  await VehicleModel.insertMany([
    { vehicleId: 'VEH-001', plateNumber: 'AA-12345', model: 'Toyota Hiace', vehicleType: 'Van', currentMileage: 42000, status: VehicleStatus.AVAILABLE },
    { vehicleId: 'VEH-002', plateNumber: 'AA-54321', model: 'Toyota Corolla', vehicleType: 'Sedan', currentMileage: 18500, status: VehicleStatus.AVAILABLE },
    { vehicleId: 'VEH-003', plateNumber: 'AA-98765', model: 'Isuzu FRR', vehicleType: 'Truck', currentMileage: 91000, status: VehicleStatus.UNDER_MAINTENANCE },
  ]);

  await DriverModel.insertMany([
    { driverId: 'DRV-001', driverName: 'Tesfaye Girma', licenseNumber: 'LIC-1001', licenseExpiry: new Date('2027-06-30'), isActive: true },
    { driverId: 'DRV-002', driverName: 'Meseret Alemayehu', licenseNumber: 'LIC-1002', licenseExpiry: new Date('2025-01-15'), isActive: true },
  ]);

  console.log('Seed complete. Demo accounts (password: Password123):');
  console.log('  employee@otech.com   (Employee)');
  console.log('  manager@otech.com    (Manager)');
  console.log('  fleet@otech.com      (Fleet Coordinator)');
  console.log('Note: DRV-002 has an expired license on purpose, to demonstrate the assignment validation.');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
