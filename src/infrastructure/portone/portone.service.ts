import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdentityVerificationClient } from '@portone/server-sdk';

@Injectable()
export class PortOneService {
  private readonly client: ReturnType<typeof IdentityVerificationClient>;

  constructor(configService: ConfigService) {
    this.client = IdentityVerificationClient({
      secret: configService.getOrThrow<string>('PORTONE_API_SECRET'),
    });
  }

  async getIdentityVerification(identityVerificationId: string) {
    return await this.client.getIdentityVerification({
      identityVerificationId,
    });
  }
}
