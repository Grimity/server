import { Module } from '@nestjs/common';
import { DdbService } from './ddb.service';

@Module({
  providers: [DdbService],
  exports: [DdbService],
})
export class DdbModule {}
