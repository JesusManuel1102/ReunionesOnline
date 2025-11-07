import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { app, port } from "./app";
import errorHanddler from "./middleware/errorHanddler";
import jwt from "jsonwebtoken";
import { chatService } from "./service/chatService";
import { pollService } from "./service/pollService";

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"],
    credentials: true,
  }
});

// Middleware de autenticación para Socket.io
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
  console.log("Socket conectado:", socket.id, "Usuario:", socket.data.user.username);

  // Unirse a una sala
  socket.on("joinRoom", (roomCode: string) => {
    socket.join(`room-${roomCode}`);
    console.log(`${socket.data.user.username} se unió a la sala ${roomCode}`);
    
    // Notificar a todos en la sala
    io.to(`room-${roomCode}`).emit("userJoined", {
      username: socket.data.user.username,
      userId: socket.data.user.id
    });
  });

  // Salir de una sala
  socket.on("leaveRoom", (roomCode: string) => {
    socket.leave(`room-${roomCode}`);
    console.log(`${socket.data.user.username} salió de la sala ${roomCode}`);
    
    io.to(`room-${roomCode}`).emit("userLeft", {
      username: socket.data.user.username,
      userId: socket.data.user.id
    });
  });

  // Mensaje en sala específica
  socket.on("roomMessage", async (payload: { roomCode: string, content: string, roomId: number }) => {
    const user = socket.data.user;
    if (!user || !payload.content) return;
    
    try {
      const msg = await chatService.saveMessage(user.id, payload.content, payload.roomId);
      io.to(`room-${payload.roomCode}`).emit("newRoomMessage", msg);
    } catch (err) {
      console.error("Error al guardar mensaje:", err);
    }
  });

  // Crear votación (solo moderador)
  socket.on("createPoll", async (payload: { roomCode: string, question: string, options: string[], roomId: number }) => {
    try {
      const poll = await pollService.createPoll(
        payload.question,
        payload.options,
        payload.roomId,
        socket.data.user.id
      );
      
      io.to(`room-${payload.roomCode}`).emit("newPoll", poll);
    } catch (err: any) {
      socket.emit("pollError", { message: err.message });
    }
  });

  // Votar
  socket.on("submitVote", async (payload: { roomCode: string, pollId: number, optionId: number }) => {
    try {
      await pollService.vote(payload.pollId, payload.optionId, socket.data.user.id);
      
      // Enviar resultados actualizados a todos
      const results = await pollService.getPollResults(payload.pollId);
      io.to(`room-${payload.roomCode}`).emit("pollResults", results);
    } catch (err: any) {
      socket.emit("voteError", { message: err.message });
    }
  });

  // Cerrar votación
  socket.on("closePoll", async (payload: { roomCode: string, pollId: number }) => {
    try {
      await pollService.closePoll(payload.pollId, socket.data.user.id);
      io.to(`room-${payload.roomCode}`).emit("pollClosed", { pollId: payload.pollId });
    } catch (err: any) {
      socket.emit("pollError", { message: err.message });
    }
  });

  // Chat público (mantener el anterior)
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