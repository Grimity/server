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

  @OnEvent('push')
  async pushNotification({ userId, ...data }: PushPayload) {
    if (!this.app) {
      console.error('Firebase Admin SDK is not initialized');
      return;
    }

    const tokens = await this.pushRepository.findManyByUserId(userId);

    if (tokens.length === 0) {
      return;
    }

    const androidConfig: admin.messaging.AndroidConfig = {
      data: data.data,
      ...(!data.silent && {
        notification: {
          title: data.title,
          body: data.text,
          ...(data.imageUrl && { imageUrl: data.imageUrl }),
          tag: data.key ?? undefined, // 같은 tag면 기존 알림 덮어씀
          ...(data.badge && { notificationCount: data.badge }),
        },
      }),
    };
    const apnsConfig: admin.messaging.ApnsConfig = {
      payload: {
        aps: {
          ...(!data.silent && {
            alert: {
              title: data.title,
              body: data.text,
            },
            ...(data.badge && { badge: data.badge }),
          }),
          ...(data.silent && { contentAvailable: true }),
          ...(data.key && { threadId: data.key }),
        },
        ...data.data, // 커스텀 데이터를 여기에 추가
      },
      fcmOptions: {
        ...(data.imageUrl && { imageUrl: data.imageUrl }), // 여기에 이미지 URL
      },
      headers: {
        ...(data.silent && {
          'apns-priority': '5', // silent 푸시를 위한 우선순위 설정
          'apns-push-type': 'background',
        }),
        ...(data.key && { 'apns-collapse-id': data.key }), // 같은 key면 기존 알림 덮어씀
      },
    };

    try {
      await admin.messaging(this.app).sendEachForMulticast({
        tokens: tokens.map((token) => token.token),
        android: androidConfig,
        apns: apnsConfig,
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
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
