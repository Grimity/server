import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DdbService {
  private configService: ConfigService;
  private client: DynamoDBDocumentClient;
  constructor(configService: ConfigService) {
    this.configService = configService;
    const dynamodbClient = new DynamoDBClient({});
    this.client = DynamoDBDocumentClient.from(dynamodbClient);
  }

  async putItemForUpdate({
    type,
    id,
    count,
  }: {
    type: 'FEED';
    id: string;
    count: number;
  }) {
    if (this.configService.get('NODE_ENV') !== 'production') return;
    const command = new PutCommand({
      TableName: this.configService.get('DYNAMODB_TABLE_NAME'),
      Item: {
        id: `${type}#${id}`,
        count,
        deleteAt: Math.floor(Date.now() / 1000) + 60 * 5,
      },
    });
    await this.client.send(command);
    return;
  }
}
