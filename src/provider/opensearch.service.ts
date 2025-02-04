import { Injectable } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenSearchService {
  private client: Client;

  constructor(private configService: ConfigService) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    this.client = new Client({
      node: this.configService.get('OPENSEARCH_NODE'),
    });
  }

  async createUser(id: string, name: string) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    return await this.client.index({
      index: 'user',
      id,
      body: {
        name,
        description: '',
        followerCount: 0,
      },
    });
  }

  async updateUser(id: string, name: string, description: string) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    return await this.client.update({
      index: 'user',
      id,
      body: {
        doc: {
          name,
          description,
        },
      },
    });
  }
}
