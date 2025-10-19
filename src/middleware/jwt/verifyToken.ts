import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { httpError } from "../errorHanddler";

export interface JwtPayload {
  id: number;
  username: string;
}

const verifyToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers["token"] as string;
  if (!token) {
    return next(httpError(401, "Token no provisto"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    return next(httpError(403, "Token inválido"));
  }
};

export default verifyToken;
