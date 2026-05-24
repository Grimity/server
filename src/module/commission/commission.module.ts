import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';
import { CommissionReader } from './repository/commission.reader';
import { CommissionWriter } from './repository/commission.writer';

@Module({
  imports: [UserModule],
  controllers: [CommissionController],
  providers: [CommissionService, CommissionWriter, CommissionReader],
})
export class CommissionModule {}
