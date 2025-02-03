import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeedSelectRepository {
  constructor(private prisma: PrismaService) {}

  async getFeedWithoutLogin(feedId: string) {
    try {
      return await this.prisma.feed.findUniqueOrThrow({
        where: {
          id: feedId,
        },
        select: {
          id: true,
          title: true,
          cards: true,
          thumbnail: true,
          isAI: true,
          createdAt: true,
          viewCount: true,
          likeCount: true,
          content: true,
          tags: true,
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              followerCount: true,
            },
          },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }

  async getFeedWithLogin(userId: string, feedId: string) {
    try {
      return await this.prisma.feed.findUniqueOrThrow({
        where: {
          id: feedId,
        },
        select: {
          id: true,
          title: true,
          cards: true,
          thumbnail: true,
          isAI: true,
          createdAt: true,
          viewCount: true,
          likeCount: true,
          content: true,
          tags: true,
          likes: {
            where: {
              userId,
            },
            select: {
              userId: true,
            },
          },
          saves: {
            where: {
              userId,
            },
            select: {
              userId: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              followerCount: true,
              followers: {
                where: {
                  followerId: userId,
                },
              },
            },
          },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }

  async findManyByUserId({
    sort,
    size,
    cursor,
    targetId,
  }: FindFeedsByUserInput) {
    let orderBy: Prisma.FeedOrderByWithRelationInput[] = [];
    const where: Prisma.FeedWhereInput = {
      authorId: targetId,
    };
    let sortCursor: string | null = null;
    let idCursor: string | null = null;
    if (cursor) {
      const arr = cursor.split('_');
      if (arr.length !== 2) {
        throw new HttpException('invalid cursor', 400);
      }
      sortCursor = arr[0];
      idCursor = arr[1];
    }
    if (sort === 'latest') {
      orderBy = [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ];
      if (sortCursor && idCursor) {
        where.OR = [
          {
            createdAt: {
              lt: new Date(sortCursor),
            },
          },
          {
            createdAt: new Date(sortCursor),
            id: {
              lt: idCursor,
            },
          },
        ];
      }
    } else if (sort === 'like') {
      orderBy = [
        {
          likeCount: 'desc',
        },
        {
          id: 'desc',
        },
      ];
      if (sortCursor && idCursor) {
        where.OR = [
          {
            likeCount: {
              lt: Number(sortCursor),
            },
          },
          {
            likeCount: Number(sortCursor),
            id: {
              lt: idCursor,
            },
          },
        ];
      }
    } else {
      orderBy = [
        {
          createdAt: 'asc',
        },
        {
          id: 'desc',
        },
      ];
      if (sortCursor && idCursor) {
        where.OR = [
          {
            createdAt: {
              gt: new Date(sortCursor),
            },
          },
          {
            createdAt: new Date(sortCursor),
            id: {
              lt: idCursor,
            },
          },
        ];
      }
    }

    const select: Prisma.FeedSelect = {
      id: true,
      title: true,
      cards: true,
      thumbnail: true,
      createdAt: true,
      viewCount: true,
      likeCount: true,
      _count: {
        select: {
          feedComments: true,
        },
      },
    };

    return await this.prisma.feed.findMany({
      where,
      take: size,
      orderBy,
      select,
    });
  }

  async findManyLatest({ userId, lastId, lastCreatedAt, size }: GetFeedsInput) {
    const where: Prisma.FeedWhereInput = {};
    if (lastId && lastCreatedAt) {
      where.OR = [
        {
          createdAt: {
            lt: new Date(lastCreatedAt),
          },
        },
        {
          createdAt: new Date(lastCreatedAt),
          id: {
            lt: lastId,
          },
        },
      ];
    }

    const select: Prisma.FeedSelect = {
      id: true,
      title: true,
      cards: true,
      thumbnail: true,
      createdAt: true,
      viewCount: true,
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
      };
    }

    return await this.prisma.feed.findMany({
      where,
      select,
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: size,
    });
  }

  async findTodayPopular({
    userId,
    size,
    likeCount,
    feedId,
  }: {
    userId: string | null;
    size: number;
    likeCount: number | null;
    feedId: string | null;
  }) {
    const where: Prisma.FeedWhereInput = {
      createdAt: {
        gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24),
      },
    };

    // cursor
    if (likeCount !== null && feedId !== null) {
      where.OR = [
        {
          likeCount: {
            lt: likeCount,
          },
        },
        {
          likeCount,
          id: {
            lt: feedId,
          },
        },
      ];
    }

    const select: Prisma.FeedSelect = {
      id: true,
      title: true,
      cards: true,
      thumbnail: true,
      createdAt: true,
      viewCount: true,
      likeCount: true,
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
      where,
      orderBy: [
        {
          likeCount: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: size,
      select,
    });
  }

  async findFollowingFeeds({
    userId,
    size,
    lastCreatedAt,
    lastId,
  }: FindFollowingFeedsInput) {
    const where: Prisma.FeedWhereInput = {
      author: {
        followers: {
          some: {
            followerId: userId,
          },
        },
      },
    };

    if (lastCreatedAt && lastId) {
      where.OR = [
        {
          createdAt: {
            lt: lastCreatedAt,
          },
        },
        {
          createdAt: lastCreatedAt,
          id: {
            lt: lastId,
          },
        },
      ];
    }

    return await this.prisma.feed.findMany({
      where,
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: size,
      select: {
        id: true,
        title: true,
        cards: true,
        thumbnail: true,
        content: true,
        createdAt: true,
        viewCount: true,
        likeCount: true,
        isAI: true,
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
        likes: {
          where: {
            userId,
          },
          select: {
            userId: true,
          },
        },
        saves: {
          where: {
            userId,
          },
          select: {
            userId: true,
          },
        },
        tags: {
          select: {
            tagName: true,
          },
        },
      },
    });
  }

  async findMyLikeFeeds(
    userId: string,
    {
      cursor,
      sort,
      size,
    }: {
      cursor: string | null;
      sort: 'latest';
      size: number;
    },
  ) {
    let where: Prisma.LikeWhereInput = {
      userId,
    };

    let orderBy: Prisma.LikeOrderByWithRelationInput[] = [];

    if (sort === 'latest') {
      orderBy = [
        {
          createdAt: 'desc',
        },
      ];
      if (cursor) {
        where = {
          ...where,
          createdAt: {
            lt: new Date(cursor),
          },
        };
      }
    }

    return await this.prisma.like.findMany({
      where,
      orderBy,
      take: size,
      select: {
        createdAt: true,
        feed: {
          select: {
            id: true,
            title: true,
            cards: true,
            thumbnail: true,
            createdAt: true,
            viewCount: true,
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
          },
        },
      },
    });
  }

  async findManyByTag({ tag, cursor, size, sort, userId }: SearchInput) {
    const where: Prisma.FeedWhereInput = {
      tags: {
        some: {
          tagName: {
            startsWith: tag,
          },
        },
      },
    };

    let orderBy: Prisma.FeedOrderByWithRelationInput[] = [];

    if (sort === 'latest') {
      orderBy = [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ];

      if (cursor) {
        const [firstCursor, secondCursor] = cursor.split('_');
        where.OR = [
          {
            createdAt: {
              lt: new Date(firstCursor),
            },
          },
          {
            createdAt: new Date(firstCursor),
            id: {
              lt: secondCursor,
            },
          },
        ];
      }
    } else if (sort === 'popular') {
      orderBy = [
        {
          likeCount: 'desc',
        },
        {
          id: 'desc',
        },
      ];

      if (cursor) {
        const [firstCursor, secondCursor] = cursor.split('_');
        where.OR = [
          {
            likeCount: {
              lt: Number(firstCursor),
            },
          },
          {
            likeCount: Number(firstCursor),
            id: {
              lt: secondCursor,
            },
          },
        ];
      }
    }

    const select: Prisma.FeedSelect = {
      id: true,
      title: true,
      createdAt: true,
      cards: true,
      thumbnail: true,
      viewCount: true,
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
      tags: {
        select: {
          tagName: true,
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
      where,
      take: size,
      orderBy,
      select,
    });
  }

  async findPopular({ userId, size, cursor }: FindPopularInput) {
    const where: Prisma.FeedWhereInput = {
      likeCount: {
        gt: 0,
      },
    };

    if (cursor) {
      const [firstCursor, secondCursor] = cursor.split('_');
      where.OR = [
        {
          createdAt: {
            lt: new Date(firstCursor),
          },
        },
        {
          createdAt: new Date(firstCursor),
          id: {
            lt: secondCursor,
          },
        },
      ];
    }

    const select: Prisma.FeedSelect = {
      id: true,
      title: true,
      thumbnail: true,
      createdAt: true,
      likeCount: true,
      viewCount: true,
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
      where,
      take: size,
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      select,
    });
  }
}

type FindPopularInput = {
  userId: string | null;
  size: number;
  cursor: string | null;
};

type FindFollowingFeedsInput = {
  userId: string;
  size: number;
  lastCreatedAt: Date | null;
  lastId: string | null;
};

type GetFeedsInput = {
  userId?: string | null;
  lastId: string | null;
  lastCreatedAt: Date | null;
  size: number;
};

type FindFeedsByUserInput = {
  sort: 'latest' | 'like' | 'oldest';
  size: number;
  cursor: string | null;
  targetId: string;
};

type SearchInput = {
  userId: string | null;
  tag: string;
  cursor: string | null;
  size: number;
  sort: 'latest' | 'popular';
};
