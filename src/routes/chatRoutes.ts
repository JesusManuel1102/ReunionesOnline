import { Router } from "express";
import verifyToken from "../middleware/jwt/verifyToken";
import { getMessages } from "../controller/chatController";

const router = Router();

// Ruta para obtener mensajes públicos recientes
// Sólo accesible si el cliente envía un token JWT válido
router.get("/", verifyToken, getMessages);

export default router;
