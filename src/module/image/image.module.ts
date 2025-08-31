import { Module } from '@nestjs/common';
import { S3Module } from 'src/infrastructure/s3/s3.module';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';

@Module({
  imports: [S3Module],
  controllers: [ImageController],
  providers: [ImageService],
})
export class ImageModule {}
