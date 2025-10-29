import { Injectable, OnModuleInit } from '@nestjs/common';
import { PushRepository } from './push.repository';
import * as admin from 'firebase-admin';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushService implements OnModuleInit {
  private app: admin.app.App | null = null;
  constructor(
    private readonly pushRepository: PushRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeFirebaseAdminSdk();
  }

  async initializeFirebaseAdminSdk() {
    const firebaseProjectId = this.configService.get<string>(
      'FIREBASE_ADMIN_SDK_PROJECT_ID',
    );
    const firebaseClientEmail = this.configService.get<string>(
      'FIREBASE_ADMIN_SDK_CLIENT_EMAIL',
    );
    const firebasePrivateKey = this.configService
      .get<string>('FIREBASE_ADMIN_SDK_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey,
      }),
    });
  }

  async pushNotification({
    userId,
    ...data
  }: {
    userId: string;
    title: string;
    body: string;
    imageUrl?: string;
  }) {
    if (!this.app) {
      console.error('Firebase Admin SDK is not initialized');
      return;
    }

    const tokens = await this.pushRepository.findManyByUserId(userId);

    if (tokens.length === 0) {
      return;
    }

    try {
      const response = await admin.messaging(this.app).sendEachForMulticast({
        tokens: tokens.map((token) => token.token),
        notification: data,
      });
      console.log('Push notification sent successfully:', response);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  @OnEvent('push')
  async handlePushEvent(payload: {
    userId: string;
    title: string;
    body: string;
    imageUrl?: string;
  }) {
    await this.pushNotification(payload);
  }

  // test
  async sendTestPushNotification({
    token,
    title,
    message,
  }: {
    token: string;
    title: string;
    message: string;
  }) {
    if (!this.app) {
      console.error('Firebase Admin SDK is not initialized');
      return;
    }

    try {
      const response = await admin.messaging(this.app).sendEachForMulticast({
        tokens: [token],
        notification: {
          title: title,
          body: message,
        },
      });
      console.log('Test push notification sent successfully:', response);
    } catch (error) {
      console.error('Error sending test push notification:', error);
    }
  }
}
