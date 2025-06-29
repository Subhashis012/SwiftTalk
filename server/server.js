import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "https://swift-talk-delta.vercel.app", // Your frontend on Vercel
  "http://localhost:3000",               // Optional: for local development
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Initialize Socket.IO
export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Store online users
export const userSocketMap = {}; // { userId: socketId }

// Socket.IO connection handling
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log(`User connected: ${userId}`);

  if (userId) {
    userSocketMap[userId] = socket.id;
    socket.join(userId);
  }

  // Emit online users to all clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // ✅ Typing event
  socket.on("typing", ({ to }) => {
    if (to) {
      io.to(to).emit("userTyping", { from: userId });
    }
  });

  // ✅ Stop typing event
  socket.on("stopTyping", ({ to }) => {
    if (to) {
      io.to(to).emit("userStopTyping", { from: userId });
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${userId}`);
    delete userSocketMap[userId];

    // Emit updated online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Middleware setup
app.use(express.json({ limit: "4mb" }));
app.use(cors());

app.use("/api/status", (req, res) => res.send("Server is running"));
// Import routes
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// Connect to MongoDB
await connectDB();

// Start the server
// For vercel or production, you might want to comment this out
// if (process.env.NODE_ENV !== "production") {
//   const PORT = process.env.PORT || 5000;
//   server.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
//   });
// }

const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

// export default server;
