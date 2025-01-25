import { ApiProperty } from '@nestjs/swagger';

class MyFollowingDto {
  @ApiProperty({ description: '팔로잉의 ID' })
  id: string;

  @ApiProperty({ description: '팔로잉의 이름' })
  name: string;

  @ApiProperty({
    description: '팔로잉의 이미지',
    nullable: true,
    type: 'string',
    example: 'profile/UUID.jpg',
  })
  image: string | null;

  @ApiProperty({ description: 'not null인데 빈문자열은 허용' })
  description: string;
}

export class MyFollowingResponse {
  @ApiProperty({
    description: '다음 데이터가 있는 경우 다음 페이지의 커서',
    type: 'string',
    nullable: true,
  })
  nextCursor: string | null;

  @ApiProperty({ description: '팔로잉 목록', type: [MyFollowingDto] })
  followings: MyFollowingDto[];
}
