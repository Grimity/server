import { ApiProperty } from '@nestjs/swagger';

class SearchedUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: 'string', nullable: true })
  image: string | null;

  @ApiProperty({ description: 'not null인데 공백일수도' })
  description: string;

  @ApiProperty({ type: 'string', nullable: true })
  backgroundImage: string | null;

  @ApiProperty()
  isFollowing: boolean;
}

export class SearchedUserResponse {
  @ApiProperty({ type: 'string', nullable: true })
  nextCursor: string | null;

  @ApiProperty({ type: SearchedUserDto, isArray: true })
  users: SearchedUserDto[];
}
