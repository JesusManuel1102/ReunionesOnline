import prisma from "../config/database";
import { httpError } from "../middleware/errorHanddler";

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const roomService = {
  async createRoom(name: string, description: string, creatorId: number) {
    const code = generateRoomCode();
    const room = await prisma.room.create({
      data: {
        name,
        description,
        code,
        creatorId,
      },
      include: {
        creator: {
          select: { id: true, username: true }
        }
      }
    });
    return room;
  },

  async getRoomByCode(code: string) {
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        creator: {
          select: { id: true, username: true }
        },
        polls: {
          where: { isOpen: true },
          include: {
            options: {
              include: {
                votes: true
              }
            }
          }
        }
      }
    });
    if (!room) {
      throw httpError(404, "Sala no encontrada");
    }
    return room;
  },

  async getActiveRooms() {
    return prisma.room.findMany({
      where: { isActive: true },
      include: {
        creator: {
          select: { id: true, username: true }
        },
        _count: {
          select: { polls: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async closeRoom(roomId: number, userId: number) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw httpError(404, "Sala no encontrada");
    if (room.creatorId !== userId) throw httpError(403, "No tienes permiso");
    
    return prisma.room.update({
      where: { id: roomId },
      data: { isActive: false }
    });
  }
};