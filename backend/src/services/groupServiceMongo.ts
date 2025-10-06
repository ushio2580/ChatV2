import { Room, User, Message } from '../models';
import mongoose from 'mongoose';

export interface CreateGroupData {
  name: string;
  description?: string;
  type?: string;
  ownerId: string;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
}

export interface GroupFilters {
  page: number;
  limit: number;
  type?: string;
}

export class GroupServiceMongo {
  // Create group
  async createGroup(data: CreateGroupData) {
    const { name, description, type = 'group', ownerId } = data;

    const group = new Room({
      name,
      description,
      type,
      ownerId,
      members: [ownerId], // Add owner as first member
      admins: [ownerId], // Add owner as admin
      settings: {
        maxMembers: 100,
        allowFileUpload: true,
        allowAnonymous: false
      }
    });

    await group.save();
    return group;
  }

  // Get all groups
  async getAllGroups(filters: GroupFilters) {
    const { page, limit, type } = filters;
    const skip = (page - 1) * limit;

    const where = type ? { type } : {};

    const groups = await Room.find(where)
      .populate('ownerId', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Room.countDocuments(where);

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
  async getGroupById(id: string) {
    const group = await Room.findById(id)
      .populate('ownerId', 'username email avatar')
      .populate('members', 'username email avatar isOnline');

    return group;
  }

  // Update group
  async updateGroup(id: string, data: UpdateGroupData) {
    const group = await Room.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    )
      .populate('ownerId', 'username email avatar')
      .populate('members', 'username email avatar isOnline');

    return group;
  }

  // Delete group
  async deleteGroup(id: string) {
    await Room.findByIdAndDelete(id);
  }

  // Join group
  async joinGroup(groupId: string, userId: string) {
    const group = await Room.findById(groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.members.includes(userId)) {
      throw new Error('You are already a member of this group');
    }

    group.members.push(userId);
    await group.save();
  }

  // Leave group
  async leaveGroup(groupId: string, userId: string) {
    const group = await Room.findById(groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.ownerId === userId) {
      throw new Error('Group owner cannot leave the group. Transfer ownership first.');
    }

    group.members = group.members.filter(memberId => memberId !== userId);
    group.admins = group.admins.filter(adminId => adminId !== userId);
    await group.save();
  }

  // Add member to group
  async addMember(groupId: string, userId: string) {
    const group = await Room.findById(groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.members.includes(userId)) {
      throw new Error('User is already a member of this group');
    }

    group.members.push(userId);
    await group.save();
  }

  // Remove member from group
  async removeMember(groupId: string, userId: string) {
    const group = await Room.findById(groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }

    group.members = group.members.filter(memberId => memberId !== userId);
    group.admins = group.admins.filter(adminId => adminId !== userId);
    await group.save();
  }

  // Get group members
  async getGroupMembers(groupId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const group = await Room.findById(groupId).populate({
      path: 'members',
      select: 'username email avatar isOnline lastSeen',
      options: {
        skip,
        limit,
        sort: { lastSeen: -1 }
      }
    });

    const total = group?.members.length || 0;

    return {
      members: group?.members || [],
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

    const messages = await Message.find({ roomId: groupId })
      .populate('senderId', 'username avatar')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ roomId: groupId });

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
}
