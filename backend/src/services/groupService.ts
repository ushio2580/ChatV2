import prisma from '../config/database';
import { Group, GroupType, GroupMemberRole, GroupSettings } from '@prisma/client';

export interface CreateGroupData {
  name: string;
  description?: string;
  type: GroupType;
  avatar?: string;
  ownerId: string;
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

export interface GroupFilters {
  page: number;
  limit: number;
  type?: string;
}

export class GroupService {
  // Create group
  async createGroup(data: CreateGroupData): Promise<Group> {
    const { name, description, type, avatar, ownerId } = data;

    const group = await prisma.group.create({
      data: {
        name,
        description,
        type,
        avatar,
        ownerId,
        settings: {
          create: {
            maxMembers: 100,
            allowFileUpload: true,
            allowAnonymous: false,
            requireApproval: false,
            allowMemberInvite: true
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
      }
    });

    // Add owner as member
    await prisma.groupMember.create({
      data: {
        userId: ownerId,
        groupId: group.id,
        role: GroupMemberRole.ADMIN
      }
    });

    return group;
  }

  // Get all groups
  async getAllGroups(filters: GroupFilters) {
    const { page, limit, type } = filters;
    const skip = (page - 1) * limit;

    const where = type ? { type: type as GroupType } : {};

    const groups = await prisma.group.findMany({
      where,
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
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.group.count({ where });

    return {
      groups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get group by ID
  async getGroupById(id: string): Promise<Group | null> {
    const group = await prisma.group.findUnique({
      where: { id },
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
      }
    });

    return group;
  }

  // Update group
  async updateGroup(id: string, data: UpdateGroupData): Promise<Group> {
    const group = await prisma.group.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
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
      }
    });

    return group;
  }

  // Delete group
  async deleteGroup(id: string): Promise<void> {
    await prisma.group.delete({
      where: { id }
    });
  }

  // Join group
  async joinGroup(groupId: string, userId: string): Promise<void> {
    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (existingMember) {
      if (existingMember.isBanned) {
        throw new Error('You are banned from this group');
      }
      throw new Error('You are already a member of this group');
    }

    // Check group settings
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { settings: true }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    if (group.settings?.requireApproval) {
      // TODO: Implement approval system
      throw new Error('This group requires approval to join');
    }

    // Add member
    await prisma.groupMember.create({
      data: {
        userId,
        groupId,
        role: GroupMemberRole.MEMBER
      }
    });
  }

  // Leave group
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!membership) {
      throw new Error('You are not a member of this group');
    }

    // Check if user is the owner
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (group?.ownerId === userId) {
      throw new Error('Group owner cannot leave the group. Transfer ownership first.');
    }

    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });
  }

  // Add member to group
  async addMember(groupId: string, userId: string, role: GroupMemberRole = GroupMemberRole.MEMBER): Promise<void> {
    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (existingMember) {
      throw new Error('User is already a member of this group');
    }

    await prisma.groupMember.create({
      data: {
        userId,
        groupId,
        role
      }
    });
  }

  // Remove member from group
  async removeMember(groupId: string, userId: string): Promise<void> {
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!membership) {
      throw new Error('User is not a member of this group');
    }

    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });
  }

  // Update member role
  async updateMemberRole(groupId: string, userId: string, role: GroupMemberRole): Promise<void> {
    await prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      data: { role }
    });
  }

  // Mute member
  async muteMember(groupId: string, userId: string): Promise<void> {
    await prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      data: { isMuted: true }
    });
  }

  // Unmute member
  async unmuteMember(groupId: string, userId: string): Promise<void> {
    await prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      data: { isMuted: false }
    });
  }

  // Ban member
  async banMember(groupId: string, userId: string): Promise<void> {
    await prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      data: { isBanned: true }
    });
  }

  // Unban member
  async unbanMember(groupId: string, userId: string): Promise<void> {
    await prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      data: { isBanned: false }
    });
  }

  // Get group members
  async getGroupMembers(groupId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isOnline: true,
            lastSeen: true
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.groupMember.count({
      where: { groupId }
    });

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
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

  // Update group settings
  async updateGroupSettings(groupId: string, settings: GroupSettingsData): Promise<GroupSettings> {
    const updatedSettings = await prisma.groupSettings.upsert({
      where: { groupId },
      update: settings,
      create: {
        groupId,
        ...settings
      }
    });

    return updatedSettings;
  }
}
