import { Router } from "express";
import verifyToken from "../middleware/jwt/verifyToken";
import { createPoll, vote, getPollResults, closePoll } from "../controller/pollController";

const router = Router();

router.use(verifyToken);

router.post("/", createPoll);
router.post("/vote", vote);
router.get("/:pollId/results", getPollResults);
router.patch("/:pollId/close", closePoll);

export default router;