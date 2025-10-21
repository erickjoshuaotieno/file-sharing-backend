import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();

const app = express();
app.use(cors());

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Routes
app.use("/", uploadRoutes);

app.get("/", (req, res) => res.send("Backend is runningV2 ✅"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 BackendV2 running on port ${PORT}`));
