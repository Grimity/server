import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostCommentRepository {
  constructor(private prisma: PrismaService) {}

  async create({
    userId,
    postId,
    parentCommentId,
    mentionedUserId,
    content,
  }: CreateInput) {
    try {
      const [post] = await this.prisma.$transaction([
        this.prisma.postComment.create({
          data: {
            writerId: userId,
            postId,
            parentId: parentCommentId,
            mentionedUserId,
            content,
          },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { commentCount: { increment: 1 } },
        }),
      ]);
      return post;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          throw new HttpException('POST', 404);
        }
      }
      throw e;
    }
  }

  async findManyByPostId(userId: string | null, postId: string) {
    const select: Prisma.PostCommentSelect & {
      childComments: {
        select: Prisma.PostCommentSelect;
        where: Prisma.PostCommentWhereInput;
        orderBy: Prisma.PostCommentOrderByWithRelationInput;
      };
    } = {
      id: true,
      content: true,
      createdAt: true,
      likeCount: true,
      isDeleted: true,
      writer: {
        select: {
          id: true,
          name: true,
        },
      },
      childComments: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          likeCount: true,
          writer: {
            select: {
              id: true,
              name: true,
            },
          },
          mentionedUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        where: {
          postId,
        },
        orderBy: {
          createdAt: 'asc',
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

      select.childComments!.select.likes = {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      };
    }

    return await this.prisma.postComment.findMany({
      where: {
        postId,
        parentId: null,
      },
      select,
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async createLike(userId: string, commentId: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.postCommentLike.create({
          data: {
            userId,
            postCommentId: commentId,
          },
        }),
        this.prisma.postComment.update({
          where: { id: commentId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new HttpException('LIKE', 409);
        } else if (e.code === 'P2003') {
          throw new HttpException('COMMENT', 404);
        }
      }
      throw e;
    }
  }

  async deleteLike(userId: string, commentId: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.postCommentLike.delete({
          where: {
            postCommentId_userId: {
              postCommentId: commentId,
              userId,
            },
          },
        }),
        this.prisma.postComment.update({
          where: { id: commentId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('LIKE', 404);
        }
      }
      throw e;
    }
  }

  async findOneById(commentId: string) {
    try {
      return await this.prisma.postComment.findUniqueOrThrow({
        where: { id: commentId },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('COMMENT', 404);
        }
      }
      throw e;
    }
  }

  async deleteParent({
    userId,
    postId,
    commentId,
  }: {
    userId: string;
    postId: string;
    commentId: string;
  }) {
    try {
      const [deleteComment] = await this.prisma.$transaction([
        this.prisma.postComment.update({
          where: {
            id: commentId,
            writerId: userId,
            parentId: null,
            isDeleted: false,
          },
          data: { isDeleted: true, content: '', writerId: null },
          select: {
            _count: {
              select: {
                childComments: {
                  where: { postId },
                },
              },
            },
          },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { commentCount: { decrement: 1 } },
        }),
      ]);

      if (deleteComment._count.childComments === 0) {
        await this.prisma.postComment.delete({
          where: { id: commentId },
        });
      }
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          throw new HttpException('COMMENT', 404);
        }
      }
      throw e;
    }
  }

  async deleteChild({
    userId,
    postId,
    commentId,
  }: {
    userId: string;
    postId: string;
    commentId: string;
  }) {
    try {
      const [deleteComment] = await this.prisma.$transaction([
        this.prisma.postComment.delete({
          where: {
            id: commentId,
            writerId: userId,
          },
          select: {
            parent: {
              select: {
                id: true,
                isDeleted: true,
                _count: {
                  select: {
                    childComments: {
                      where: { postId },
                    },
                  },
                },
              },
            },
          },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { commentCount: { decrement: 1 } },
        }),
      ]);

      if (
        deleteComment.parent?.isDeleted &&
        deleteComment.parent?._count.childComments === 1
      ) {
        await this.prisma.postComment.delete({
          where: { id: deleteComment.parent.id },
        });
      }
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          throw new HttpException('COMMENT', 404);
        }
      }
      throw e;
    }
  }
}

type CreateInput = {
  userId: string;
  postId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
};
