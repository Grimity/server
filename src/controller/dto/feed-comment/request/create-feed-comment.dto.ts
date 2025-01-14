import {
  Length,
  IsString,
  IsUUID,
  ValidateIf,
  IsOptional,
} from 'class-validator';

export class CreateFeedCommentDto {
  @IsUUID()
  feedId: string;

  @ValidateIf((o) => o.parentCommentId !== null)
  @IsUUID()
  @IsOptional()
  parentCommentId: string | null;

  @IsString()
  @Length(1, 1000)
  comment: string;
}
