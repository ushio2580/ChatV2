import prisma from '../config/database';
import { Message, MessageType, MessageReaction } from '@prisma/client';

export interface SendGroupMessageData {
  groupId: string;
  senderId: string;
  content: string;
  type?: MessageType;
}

export interface SendPrivateMessageData {
  senderId: string;
  receiverId: string;
  content: string;
  type?: MessageType;
}

export interface MessageFilters {
  page: number;
  limit: number;
  groupId?: string;
  userId?: string;
  currentUserId?: string;
}

export class MessageService {
  // Send message to group
  async sendGroupMessage(data: SendGroupMessageData): Promise<Message> {
    const { groupId, senderId, content, type = MessageType.TEXT } = data;

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: senderId,
          groupId
        }
      }
    });

    if (!membership) {
      throw new Error('You are not a member of this group');
    }

    if (membership.isMuted) {
      throw new Error('You are muted in this group');
    }

    if (membership.isBanned) {
      throw new Error('You are banned from this group');
    }

    const message = await prisma.message.create({
      data: {
        content,
        type,
        senderId,
        groupId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    return message;
  }

  // Send private message
  async sendPrivateMessage(data: SendPrivateMessageData): Promise<Message> {
    const { senderId, receiverId, content, type = MessageType.TEXT } = data;

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      throw new Error('Receiver not found');
    }

    const message = await prisma.message.create({
      data: {
        content,
        type,
        senderId,
        receiverId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    return message;
  }

  // Get group messages
  async getGroupMessages(groupId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: { groupId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.message.count({
      where: { groupId }
    });

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get private messages between users
  async getPrivateMessages(userId1: string, userId2: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: userId1,
            receiverId: userId2
          },
          {
            senderId: userId2,
            receiverId: userId1
          }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.message.count({
      where: {
        OR: [
          {
            senderId: userId1,
            receiverId: userId2
          },
          {
            senderId: userId2,
            receiverId: userId1
          }
        ]
      }
    });

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get message by ID
  async getMessageById(id: string): Promise<Message | null> {
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    return message;
  }

  // Edit message
  async editMessage(id: string, content: string, userId: string): Promise<Message> {
    const message = await prisma.message.findUnique({
      where: { id }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('You can only edit your own messages');
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        content,
        editedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    return updatedMessage;
  }

  // Delete message
  async deleteMessage(id: string, userId: string): Promise<void> {
    const message = await prisma.message.findUnique({
      where: { id }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('You can only delete your own messages');
    }

    await prisma.message.update({
      where: { id },
      data: { isDeleted: true }
    });
  }

  // Add reaction to message
  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    // Check if message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user already reacted with this emoji
    const existingReaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      }
    });

    if (existingReaction) {
      throw new Error('You have already reacted with this emoji');
    }

    const reaction = await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji
      },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return reaction;
  }

  // Remove reaction from message
  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const reaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      }
    });

    if (!reaction) {
      throw new Error('Reaction not found');
    }

    await prisma.messageReaction.delete({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      }
    });
  }

  // Get message reactions
  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return reactions;
  }

  // Search messages
  async searchMessages(query: string, filters: MessageFilters) {
    const { page, limit, groupId, userId, currentUserId } = filters;
    const skip = (page - 1) * limit;

    let where: any = {
      content: {
        contains: query,
        mode: 'insensitive'
      },
      isDeleted: false
    };

    if (groupId) {
      where.groupId = groupId;
    } else if (userId && currentUserId) {
      where.OR = [
        {
          senderId: currentUserId,
          receiverId: userId
        },
        {
          senderId: userId,
          receiverId: currentUserId
        }
      ];
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.message.count({ where });

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Mark messages as read (placeholder for future implementation)
  async markMessagesAsRead(messageIds: string[], userId: string): Promise<void> {
    // TODO: Implement message read status tracking
    console.log(`Marking messages ${messageIds.join(', ')} as read for user ${userId}`);
  }
}
