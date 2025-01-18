import { Injectable } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
// import { ScanCommand, QueryCommand } from '@aws-sdk/client-dynamodb';

@Injectable()
export class NotificationRepository {
  private dynamoDBClient: DynamoDBClient;
  constructor() {
    this.dynamoDBClient = new DynamoDBClient();
  }
}
