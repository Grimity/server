import {
  Controller,
  Post,
  Body,
  UseGuards,
  Put,
  Param,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FeedService } from 'src/provider/feed.service';
import { CreateFeedDto, FeedIdDto } from './dto/feed';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';

@ApiTags('/feeds')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('feeds')
export class FeedController {
  constructor(private feedService: FeedService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 생성' })
  @ApiResponse({
    status: 201,
    description: '피드 생성 성공',
    type: FeedIdDto,
  })
  @UseGuards(JwtGuard)
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() createFeedDto: CreateFeedDto,
  ): Promise<FeedIdDto> {
    return await this.feedService.create(userId, createFeedDto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'like' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Put('like/:feedId')
  async like(
    @CurrentUser() userId: string,
    @Param('feedId', new ParseUUIDPipe()) feedId: string,
  ) {
    await this.feedService.like(userId, feedId);
    return;
  }
}
