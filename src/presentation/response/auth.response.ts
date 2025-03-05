import { ApiProperty } from '@nestjs/swagger';

export class JwtResponse {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class LoginResponse extends JwtResponse {
  @ApiProperty()
  id: string;
}

export class Register409Response {
  @ApiProperty({ enum: [409] })
  statusCode: 409;

  @ApiProperty({
    enum: ['NAME', 'USER'],
    description: 'NAME: 닉네임 중복, USER: 이미 회원가입 한 유저',
  })
  message: string;
}
