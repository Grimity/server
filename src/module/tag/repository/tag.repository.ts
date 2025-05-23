import { PrismaService } from 'src/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { kyselyUuid } from 'src/shared/util/convert-uuid';

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
    if (feedIds.length === 0) return [];
    const feeds = await this.prisma.$kysely
      .selectFrom('Feed')
      .where('Feed.id', 'in', feedIds.map(kyselyUuid))
      .select([
        'Feed.id',
        'title',
        'thumbnail',
        'likeCount',
        'viewCount',
        'authorId',
      ])
      .innerJoin('User', 'User.id', 'Feed.authorId')
      .select(['name', 'url', 'image'])
      .$if(userId !== null, (eb) =>
        eb.select((eb) =>
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('Like')
                .whereRef('Like.feedId', '=', 'Feed.id')
                .where('Like.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isLike'),
        ),
      )
      .limit(8)
      .execute();

    return feeds.map((feed) => ({
      id: feed.id,
      title: feed.title,
      thumbnail: feed.thumbnail,
      likeCount: feed.likeCount,
      viewCount: feed.viewCount,
      isLike: feed.isLike ?? false,
      author: {
        id: feed.authorId,
        name: feed.name,
        url: feed.url,
        image: feed.image,
      },
    }));
  }
}
