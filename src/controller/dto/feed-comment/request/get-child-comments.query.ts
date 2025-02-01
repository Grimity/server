import { IsUUID } from 'class-validator';

export class GetChildCommentsQuery {
  @IsUUID()
  feedId: string;

  @IsUUID()
  parentId: string;
}
