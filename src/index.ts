import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { app, port } from "./app";
import errorHanddler from "./middleware/errorHanddler";
import jwt from "jsonwebtoken";
import { chatService } from "./service/chatService";

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"],
    credentials: true,
  }
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      throw new Error("Token no proporcionado");
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
    socket.data.user = payload;
    next();
  } catch (err) {
    console.error("Socket auth error:", err);
    next(new Error("Token inválido"));
  }
});

io.on("connection", (socket) => {
  console.log("Socket conectado:", socket.id);

  socket.on("publicMessage", async (payload) => {
    const user = socket.data.user;
    if (!user || !payload.content) return;
    const msg = await chatService.saveMessage(user.id, payload.content);
    io.emit("newPublicMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("Socket desconectado:", socket.id);
  });
});

app.use(errorHanddler);

server.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
