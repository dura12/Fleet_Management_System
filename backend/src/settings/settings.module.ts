import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Branch, BranchSchema } from './branch.schema';
import { Department, DepartmentSchema } from './department.schema';
import { Destination, DestinationSchema } from './destination.schema';
import { UserDestinationHistory, UserDestinationHistorySchema } from './user-destination-history.schema';
import { UserBranchHistory, UserBranchHistorySchema } from './user-branch-history.schema';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Branch.name, schema: BranchSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Destination.name, schema: DestinationSchema },
      { name: UserDestinationHistory.name, schema: UserDestinationHistorySchema },
      { name: UserBranchHistory.name, schema: UserBranchHistorySchema },
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
