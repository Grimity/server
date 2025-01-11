import { ApiProperty } from '@nestjs/swagger';

export class Register409Dto {
  @ApiProperty()
  statusCode: number;

  @ApiProperty({
    enum: ['NAME', 'USER'],
    description: 'NAME: 닉네임 중복, USER: 이미 회원가입 한 유저',
  })
  message: 'NAME' | 'USER';
}
