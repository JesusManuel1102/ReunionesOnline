import prisma from "../config/database";

export const chatService = {
  async saveMessage(userId: number, content: string, roomId?: number) {
    const msg = await prisma.message.create({
      data: { 
        userId, 
        content, 
        roomId: roomId || null  // ⬅️ SOLUCIÓN: Si no hay roomId, usa null
      },
      include: { user: { select: { username: true } } },
    });
    return {
      id: msg.id,
      content: msg.content,
      username: msg.user.username,
      createdAt: msg.createdAt,
    };
  },

  async getRecentMessages(limit = 20, roomId?: number) {
    const msgs = await prisma.message.findMany({
      where: roomId ? { roomId } : { roomId: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { username: true } } },
    });
    return msgs.reverse().map((m) => ({
      id: m.id,
      content: m.content,
      username: m.user.username,
      createdAt: m.createdAt,
    }));
  },
};