import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleRequest, VehicleRequestSchema } from './vehicle-request.schema';
import { VehicleAssignment, VehicleAssignmentSchema } from '../assignments/vehicle-assignment.schema';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { DriversModule } from '../drivers/drivers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VehicleRequest.name, schema: VehicleRequestSchema },
      { name: VehicleAssignment.name, schema: VehicleAssignmentSchema },
    ]),
    VehiclesModule,
    DriversModule,
    NotificationsModule,
    SettingsModule,
    UsersModule,
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
