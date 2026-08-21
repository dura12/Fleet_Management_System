import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Vehicle, VehicleSchema } from '../vehicles/vehicle.schema';
import { VehicleRequest, VehicleRequestSchema } from '../requests/vehicle-request.schema';
import { VehicleAssignment, VehicleAssignmentSchema } from '../assignments/vehicle-assignment.schema';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: VehicleRequest.name, schema: VehicleRequestSchema },
      { name: VehicleAssignment.name, schema: VehicleAssignmentSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
