import { PrismaService } from 'src/provider/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TagRepository {
  constructor(private prisma: PrismaService) {}

  async findPopularTags() {
    return (await this.prisma.$queryRaw`
      with top_tags as (
        SELECT 
          "tagName",
          COUNT(*) AS tag_count
        FROM "Tag"
        GROUP BY "tagName"
        ORDER BY tag_count DESC
        LIMIT 30
      ),
      random_feed_per_tag as (
        SELECT 
          DISTINCT ON (t."tagName") 
          t."tagName", 
          f.id AS "feedId" ,
          f.thumbnail
        FROM 
          "Tag" t
        JOIN 
          "Feed" f ON t."feedId" = f.id
        WHERE 
          t."tagName" IN (SELECT "tagName" FROM top_tags)
      )
      select
        "tagName",
        thumbnail
      from
        random_feed_per_tag
    `) as { tagName: string; thumbnail: string }[];
  }
}
