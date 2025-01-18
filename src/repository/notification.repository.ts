import { Injectable } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ConfigService } from '@nestjs/config';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class NotificationRepository {
  private dynamoDBClient: DynamoDBClient;
  constructor(private configService: ConfigService) {
    this.dynamoDBClient = new DynamoDBClient();
  }

  async findAll(userId: string) {
    // createdAt desc
    const command = new QueryCommand({
      TableName: this.configService.get('AWS_DYNAMODB_TABLE_NAME'),
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false,
      Limit: 50,
    });
    const response = await this.dynamoDBClient.send(command);
    const items = response.Items as NotificationItem[];
    return items.map((item) => {
      return {
        feedId: item.feedId || null,
        createdAt: new Date(item.createdAt),
        actorId: item.actorId,
        actorName: item.actorName,
        id: item.id,
        isRead: item.isRead,
        type: item.type,
      };
    });
  }
}

export type NotificationItem = {
  expiresAt: number;
  userId: string;
  feedId?: string;
  createdAt: number;
  actorId: string;
  actorName: string;
  id: string;
  isRead: boolean;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW';
};
