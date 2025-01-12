import { Controller, Put, UseGuards, Body, HttpCode } from '@nestjs/common';
import { UserService } from 'src/provider/user.service';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import { UpdateProfileImageDto } from 'src/controller/dto/user';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Put('me/image')
  async updateProfileImage(
    @CurrentUser() userId: string,
    @Body() { filename }: UpdateProfileImageDto,
  ) {
    await this.userService.updateProfileImage(userId, filename);
    return;
  }
}
