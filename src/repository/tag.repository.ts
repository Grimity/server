import { PrismaService } from 'src/provider/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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

  async findFeedsByIds(userId: string | null, feedIds: string[]) {
    const select: Prisma.FeedSelect = {
      id: true,
      title: true,
      thumbnail: true,
      likeCount: true,
      viewCount: true,
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    };

    if (userId) {
      select.likes = {
        select: {
          userId: true,
        },
        where: {
          userId,
        },
      };
    }

    return await this.prisma.feed.findMany({
      where: {
        id: {
          in: feedIds,
        },
      },
      select,
    });
  }
}
