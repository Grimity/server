import { ApiProperty } from '@nestjs/swagger';
import { LinkDto } from '../request/upload-profile.dto';

export class UserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true, example: 'profile/image.png', type: 'string' })
  image: string | null;

  @ApiProperty({ description: '빈 문자열 허용' })
  description: string;

  @ApiProperty({ type: LinkDto, isArray: true })
  links: LinkDto[];

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  followingCount: number;

  @ApiProperty()
  feedCount: number;

  @ApiProperty({ description: '비 로그인유저면 false만 반환함 ' })
  isFollowing: boolean;

  @ApiProperty({ description: '이메일' })
  email: string;
}
