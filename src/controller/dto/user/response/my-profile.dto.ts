import { ApiProperty } from '@nestjs/swagger';

// TODO: 리팩터링해야함
export class LinkDto {
  @ApiProperty({ example: '인스타그램' })
  linkName: string;

  @ApiProperty({ example: 'https://www.instagram.com/username' })
  link: string;
}

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

  @ApiProperty({
    description: '배경 이미지',
    example: 'background/{UUID}.jpg',
    nullable: true,
  })
  backgroundImage: string | null;

  @ApiProperty({ description: '자기소개, not null인데 빈문자열 허용' })
  description: string;

  @ApiProperty({ type: LinkDto, isArray: true })
  links: LinkDto[];

  @ApiProperty({ description: '가입일' })
  createdAt: Date;

  @ApiProperty({ description: '알림 여부' })
  hasNotification: boolean;
}
