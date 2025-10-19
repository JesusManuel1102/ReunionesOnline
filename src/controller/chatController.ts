import { Request, Response, NextFunction } from "express";
import { chatService } from "../service/chatService";

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const msgs = await chatService.getRecentMessages();
    res.json(msgs);
  } catch (err) {
    next(err);
  }
};
