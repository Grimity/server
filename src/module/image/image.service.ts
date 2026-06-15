import { Injectable } from '@nestjs/common';
import { exts, imageTypes } from 'src/common/constants/image.constant';
import { S3Service } from 'src/infrastructure/s3/s3.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ImageService {
  constructor(
    private s3Service: S3Service,
    private configService: ConfigService,
  ) {}

  async createImageUploadUrl({
    type,
    ext,
    width,
    height,
    fileName,
  }: {
    type: (typeof imageTypes)[number];
    ext: (typeof exts)[number];
    width: number;
    height: number;
    fileName?: string;
  }) {
    const uuid = crypto.randomUUID();

    let key: string;
    if (fileName) {
      // uuid를 폴더로 두어 마지막 경로 세그먼트가 원본명이 되도록 → 다운로드 시 원본명 유지
      const safeName = this.sanitizeFileName(fileName) || 'image';
      key = `v2/${type}/${uuid}/${safeName}_${width}x${height}.${ext}`;
    } else {
      // 기존 동작 그대로 유지
      key = `v2/${type}/${uuid}_${width}x${height}.${ext}`;
    }

    const presignedUrl = await this.s3Service.createImageUploadUrl(key);

    return {
      uploadUrl: presignedUrl,
      imageName: key,
      imageUrl: `${this.configService.get('IMAGE_URL')}/${key}`,
    };
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/\.[^/.]+$/, '') // 확장자 제거
      // _(프론트 WxH 파싱용), 경로구분자, 공백, URL/S3 비안전 문자 → -
      .replace(/[_/\\\s?#%&+=:;,*'"`<>{}[\]^~|()@$!]+/g, '-')
      .replace(/-{2,}/g, '-') // 연속 - 축약
      .replace(/^-+|-+$/g, ''); // 앞뒤 - 정리
  }
}
