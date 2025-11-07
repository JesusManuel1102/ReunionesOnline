import { Router } from "express";
import verifyToken from "../middleware/jwt/verifyToken";
import { createRoom, getRoomByCode, getActiveRooms, closeRoom } from "../controller/roomController";

const router = Router();

router.use(verifyToken);

router.post("/", createRoom);
router.get("/", getActiveRooms);
router.get("/:code", getRoomByCode);
router.delete("/:id", closeRoom);

export default router;