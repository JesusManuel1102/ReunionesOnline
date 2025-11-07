import { Request, Response, NextFunction } from "express";
import { pollService } from "../service/pollService";

export const createPoll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, options, roomId } = req.body;
    const creatorId = req.user.id;
    const poll = await pollService.createPoll(question, options, roomId, creatorId);
    res.status(201).json(poll);
  } catch (err) {
    next(err);
  }
};

export const vote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pollId, optionId } = req.body;
    const userId = req.user.id;
    await pollService.vote(pollId, optionId, userId);
    res.json({ message: "Voto registrado" });
  } catch (err) {
    next(err);
  }
};

export const getPollResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pollId } = req.params;
    const results = await pollService.getPollResults(Number(pollId));
    res.json(results);
  } catch (err) {
    next(err);
  }
};

export const closePoll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pollId } = req.params;
    const userId = req.user.id;
    await pollService.closePoll(Number(pollId), userId);
    res.json({ message: "Votación cerrada" });
  } catch (err) {
    next(err);
  }
};