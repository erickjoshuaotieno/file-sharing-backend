// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();

const app = express();

// ✅ Explicit & flexible CORS setup
const allowedOrigins = [
  "http://localhost:3000",
  "https://secureshere.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn("❌ Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

// ✅ Routes
app.use("/", uploadRoutes);

// ✅ Simple health check
app.get("/", (req, res) => res.send("Backend using AWS S3 ✅"));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
