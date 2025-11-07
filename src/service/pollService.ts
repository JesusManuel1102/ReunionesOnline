import prisma from "../config/database";
import { httpError } from "../middleware/errorHanddler";

export const pollService = {
  async createPoll(question: string, options: string[], roomId: number, creatorId: number) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw httpError(404, "Sala no encontrada");
    if (room.creatorId !== creatorId) throw httpError(403, "Solo el moderador puede crear votaciones");

    const poll = await prisma.poll.create({
      data: {
        question,
        roomId,
        options: {
          create: options.map(text => ({ text }))
        }
      },
      include: {
        options: true
      }
    });
    return poll;
  },

  async vote(pollId: number, optionId: number, userId: number) {
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) throw httpError(404, "Votación no encontrada");
    if (!poll.isOpen) throw httpError(400, "La votación está cerrada");

    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_pollId: { userId, pollId }
      }
    });

    if (existingVote) {
      return prisma.vote.update({
        where: { id: existingVote.id },
        data: { optionId }
      });
    }

    return prisma.vote.create({
      data: { userId, pollId, optionId }
    });
  },

  async getPollResults(pollId: number) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
        _count: {
          select: { votes: true }
        }
      }
    });

    if (!poll) throw httpError(404, "Votación no encontrada");

    return {
      question: poll.question,
      isOpen: poll.isOpen,
      totalVotes: poll._count.votes,
      options: poll.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        votes: opt._count.votes
      }))
    };
  },

  async closePoll(pollId: number, userId: number) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { room: true }
    });
    if (!poll) throw httpError(404, "Votación no encontrada");
    if (poll.room.creatorId !== userId) throw httpError(403, "Solo el moderador puede cerrar la votación");

    return prisma.poll.update({
      where: { id: pollId },
      data: { isOpen: false, closedAt: new Date() }
    });
  }
};