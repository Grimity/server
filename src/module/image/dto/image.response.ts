import { ApiProperty } from '@nestjs/swagger';

export class ImageUploadUrlResponse {
  @ApiProperty({ description: 'presignedURL입니다. 여기로 put 메소드 쏘면 됨' })
  uploadUrl: string;

  @ApiProperty({
    description: '업로드할 이미지의 이름입니다.',
    example: 'feed/1234.webp',
  })
  imageName: string;

  @ApiProperty({
    description: '업로드 성공했으면 접근가능한 full URL 입니다',
    example: 'https://image.grimity.com/feed/1234.webp',
  })
  imageUrl: string;
}
