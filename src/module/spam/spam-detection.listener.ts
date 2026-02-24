import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GoogleGenAI } from '@google/genai';
import { EventPayloadMap } from 'src/infrastructure/event/event-payload.types';
import { PostWriter } from '../post/repository/post.writer';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

@Injectable()
export class SpamDetectionListener {
  private readonly logger = new Logger(SpamDetectionListener.name);

  constructor(private readonly postWriter: PostWriter) {}

  @OnEvent('post:CREATED')
  async handlePostCreated({
    postId,
    title,
    content,
  }: EventPayloadMap['post:CREATED']) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [`제목: ${title}\n내용: ${content}`],
        config: {
          systemInstruction:
            '우리 서비스는 그림 커뮤니티인데 그림 유저가 아닌 사람이 홍보용으로 글을 쓴 건지 판단해줘',
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object' as const,
            properties: {
              isPromotion: {
                type: 'boolean' as const,
                description: '홍보성 글 여부',
              },
              reason: {
                type: 'string' as const,
                description: '판단 근거',
              },
            },
            required: ['isPromotion', 'reason'],
          },
        },
      });

      const result = JSON.parse(response.text ?? '{}');

      if (result.isPromotion) {
        this.logger.warn(
          `[스팸 감지] postId=${postId} | reason=${result.reason}`,
        );
        await this.postWriter.forceDelete(postId);
        this.logger.warn(`[스팸 삭제 완료] postId=${postId}`);
        this.logger.warn(`[게시글 제목] ${title}`);
        this.logger.warn(`[게시글 내용] ${content}`);
      }
    } catch (error) {
      this.logger.error(`[스팸 감지 실패] postId=${postId}`, error);
    }
  }
}
