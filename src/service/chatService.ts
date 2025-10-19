import prisma from "../config/database";

export const chatService = {
  async saveMessage(userId: number, content: string) {
    const msg = await prisma.message.create({
      data: { userId, content },
      include: { user: { select: { username: true } } },
    });
    return {
      id: msg.id,
      content: msg.content,
      username: msg.user.username,
      createdAt: msg.createdAt,
    };
  },

  async getRecentMessages(limit = 20) {
    const msgs = await prisma.message.findMany({
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
