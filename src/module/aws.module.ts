import { Module } from '@nestjs/common';
import { AwsService } from 'src/provider/aws.service';
import { AwsController } from 'src/presentation/controller/aws.controller';

@Module({
  controllers: [AwsController],
  providers: [AwsService],
  exports: [AwsService],
})
export class AwsModule {}
