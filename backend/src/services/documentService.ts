import prisma from '../config/database';
import { Document, DocumentEdit } from '@prisma/client';

export interface CreateDocumentData {
  title: string;
  groupId: string;
  content: string;
  userId: string;
}

export interface UpdateDocumentData {
  title?: string;
  content?: string;
}

export interface DocumentFilters {
  page: number;
  limit: number;
  groupId?: string;
  userId?: string;
}

export class DocumentService {
  // Create document
  async createDocument(data: CreateDocumentData): Promise<Document> {
    const { title, groupId, content, userId } = data;

    // Check if user is member of the group
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

    const document = await prisma.document.create({
      data: {
        title,
        content,
        groupId,
        version: 1
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        edits: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          },
          orderBy: {
            editedAt: 'desc'
          },
          take: 10
        }
      }
    });

    // Create initial edit record
    await prisma.documentEdit.create({
      data: {
        documentId: document.id,
        userId,
        content,
        version: 1,
        changeType: 'create'
      }
    });

    return document;
  }

  // Get document by ID
  async getDocumentById(id: string, userId: string): Promise<Document | null> {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        edits: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          },
          orderBy: {
            editedAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!document) {
      return null;
    }

    // Check if user has access to this document
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: document.groupId
        }
      }
    });

    if (!membership) {
      throw new Error('Access denied');
    }

    return document;
  }

  // Update document
  async updateDocument(id: string, data: UpdateDocumentData, userId: string): Promise<Document> {
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user has access to this document
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: document.groupId
        }
      }
    });

    if (!membership) {
      throw new Error('Access denied');
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        ...data,
        version: document.version + 1,
        updatedAt: new Date()
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        edits: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          },
          orderBy: {
            editedAt: 'desc'
          },
          take: 10
        }
      }
    });

    // Create edit record
    await prisma.documentEdit.create({
      data: {
        documentId: id,
        userId,
        content: data.content || document.content,
        version: updatedDocument.version,
        changeType: 'update'
      }
    });

    return updatedDocument;
  }

  // Delete document
  async deleteDocument(id: string, userId: string): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user is group owner or admin
    const group = await prisma.group.findUnique({
      where: { id: document.groupId }
    });

    if (!group || (group.ownerId !== userId && group.adminId !== userId)) {
      throw new Error('Only group owner or admin can delete documents');
    }

    await prisma.document.delete({
      where: { id }
    });
  }

  // Get group documents
  async getGroupDocuments(groupId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const documents = await prisma.document.findMany({
      where: { groupId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        edits: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          },
          orderBy: {
            editedAt: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.document.count({
      where: { groupId }
    });

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get document history
  async getDocumentHistory(id: string, userId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    // Check if user has access to this document
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: document.groupId
        }
      }
    });

    if (!membership) {
      throw new Error('Access denied');
    }

    const history = await prisma.documentEdit.findMany({
      where: { documentId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: {
        editedAt: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.documentEdit.count({
      where: { documentId: id }
    });

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Restore document version
  async restoreDocumentVersion(id: string, version: number, userId: string): Promise<Document> {
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user has access to this document
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: document.groupId
        }
      }
    });

    if (!membership) {
      throw new Error('Access denied');
    }

    // Get the version to restore
    const versionToRestore = await prisma.documentEdit.findFirst({
      where: {
        documentId: id,
        version
      }
    });

    if (!versionToRestore) {
      throw new Error('Version not found');
    }

    const restoredDocument = await prisma.document.update({
      where: { id },
      data: {
        content: versionToRestore.content,
        version: document.version + 1,
        updatedAt: new Date()
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        edits: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          },
          orderBy: {
            editedAt: 'desc'
          },
          take: 10
        }
      }
    });

    // Create edit record for restoration
    await prisma.documentEdit.create({
      data: {
        documentId: id,
        userId,
        content: versionToRestore.content,
        version: restoredDocument.version,
        changeType: 'restore'
      }
    });

    return restoredDocument;
  }

  // Compare document versions
  async compareDocumentVersions(id: string, version1: number, version2: number, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user has access to this document
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: document.groupId
        }
      }
    });

    if (!membership) {
      throw new Error('Access denied');
    }

    const [version1Data, version2Data] = await Promise.all([
      prisma.documentEdit.findFirst({
        where: { documentId: id, version: version1 }
      }),
      prisma.documentEdit.findFirst({
        where: { documentId: id, version: version2 }
      })
    ]);

    if (!version1Data || !version2Data) {
      throw new Error('One or both versions not found');
    }

    return {
      version1: {
        version: version1,
        content: version1Data.content,
        editedAt: version1Data.editedAt,
        user: version1Data.userId
      },
      version2: {
        version: version2,
        content: version2Data.content,
        editedAt: version2Data.editedAt,
        user: version2Data.userId
      },
      differences: this.calculateDifferences(version1Data.content, version2Data.content)
    };
  }

  // Get document collaborators
  async getDocumentCollaborators(id: string, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user has access to this document
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: document.groupId
        }
      }
    });

    if (!membership) {
      throw new Error('Access denied');
    }

    const collaborators = await prisma.documentEdit.groupBy({
      by: ['userId'],
      where: { documentId: id },
      _count: { id: true },
      _max: { editedAt: true }
    });

    const collaboratorDetails = await Promise.all(
      collaborators.map(async (collaborator) => {
        const user = await prisma.user.findUnique({
          where: { id: collaborator.userId },
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true
          }
        });

        return {
          user,
          editCount: collaborator._count.id,
          lastEdit: collaborator._max.editedAt
        };
      })
    );

    return collaboratorDetails;
  }

  // Share document (placeholder for future implementation)
  async shareDocument(id: string, userId: string, permission: string, currentUserId: string): Promise<void> {
    // TODO: Implement document sharing logic
    throw new Error('Document sharing not implemented yet');
  }

  // Unshare document (placeholder for future implementation)
  async unshareDocument(id: string, userId: string, currentUserId: string): Promise<void> {
    // TODO: Implement document unsharing logic
    throw new Error('Document unsharing not implemented yet');
  }

  // Search documents
  async searchDocuments(query: string, filters: DocumentFilters) {
    const { page, limit, groupId, userId } = filters;
    const skip = (page - 1) * limit;

    let where: any = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (groupId) {
      where.groupId = groupId;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        group: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        edits: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          },
          orderBy: {
            editedAt: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.document.count({ where });

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Calculate differences between two text versions
  private calculateDifferences(text1: string, text2: string): any {
    // Simple diff implementation - in production, use a proper diff library
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    
    const differences = [];
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 !== line2) {
        differences.push({
          line: i + 1,
          old: line1,
          new: line2
        });
      }
    }
    
    return differences;
  }
}
