import prisma from '../config/database';
import { User, Group, GroupMember, GroupType, GroupMemberRole } from '@prisma/client';

export interface CreateGroupData {
  name: string;
  description?: string;
  type: GroupType;
  avatar?: string;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  avatar?: string;
}

export interface GroupSettingsData {
  maxMembers?: number;
  allowFileUpload?: boolean;
  allowAnonymous?: boolean;
  requireApproval?: boolean;
  allowMemberInvite?: boolean;
}

export class UserService {
  // Get all users
  async getAllUsers(): Promise<Omit<User, 'password'>[]> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return users;
  }

  // Get user by ID
  async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return user;
  }

  // Update user
  async updateUser(id: string, data: UpdateGroupData): Promise<Omit<User, 'password'>> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return user;
  }

  // Delete user
  async deleteUser(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id }
    });
  }

  // Get user's groups
  async getUserGroups(userId: string): Promise<Group[]> {
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        admin: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true
              }
            }
          }
        },
        settings: true,
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return groups;
  }

  // Get user's messages
  async getUserMessages(userId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
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

    const total = await prisma.message.count({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
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

  // Get user's files
  async getUserFiles(userId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const files = await prisma.file.findMany({
      where: {
        uploadedBy: userId
      },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.file.count({
      where: {
        uploadedBy: userId
      }
    });

    return {
      files,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get online users
  async getOnlineUsers(): Promise<Omit<User, 'password'>[]> {
    const users = await prisma.user.findMany({
      where: {
        isOnline: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        lastSeen: 'desc'
      }
    });

    return users;
  }

  // Search users
  async searchUsers(query: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        username: 'asc'
      },
      skip,
      take: limit
    });

    const total = await prisma.user.count({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } }
        ]
      }
    });

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}
