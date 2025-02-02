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

  async searchTags(userId: string | null, tagNames: string[]) {
    const some: Prisma.TagWhereInput = {
      OR: tagNames.map((tagName) => ({
        tagName: {
          startsWith: tagName,
        },
      })),
    };
    const select: Prisma.FeedSelect = {
      id: true,
      title: true,
      thumbnail: true,
      likeCount: true,
      _count: {
        select: {
          feedComments: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    };
    if (userId) {
      select.likes = {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      };
    }
    return await this.prisma.feed.findMany({
      where: {
        tags: {
          some,
        },
      },
      select,
      take: 8,
    });
  }
}
