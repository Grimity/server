import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { AwsService } from './aws.service';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private awsService: AwsService,
  ) {}
}
