import { ApiProperty } from '@nestjs/swagger';
import { LinkDto } from '../request/upload-profile.dto';

export class MyProfileDto {
  @ApiProperty({ description: '유저 아이디' })
  id: string;

  @ApiProperty({ enum: ['KAKAO', 'GOOGLE'] })
  provider: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    description: '프로필 이미지',
    example: 'profile/{UUID}.jpg',
    nullable: true,
  })
  image: string | null;

  @ApiProperty({ description: '자기소개, not null인데 빈문자열 허용' })
  description: string;

  @ApiProperty({ type: LinkDto, isArray: true })
  links: LinkDto[];

  @ApiProperty({ description: '가입일' })
  createdAt: Date;

  @ApiProperty({ description: '팔로워 수' })
  followerCount: number;

  @ApiProperty({ description: '팔로잉 수' })
  followingCount: number;

  @ApiProperty({ description: '알림 유무' })
  hasNotification: boolean;
}
