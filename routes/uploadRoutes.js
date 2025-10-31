import express from "express";
import multer from "multer";
import path from "path";
import stream from "stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ✅ Presign upload URL (client uploads directly to S3)
router.post("/presign-upload", express.json(), async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) {
      return res.status(400).json({ error: "Filename and contentType are required" });
    }

    // Clean filename
    const parsed = path.parse(filename);
    const cleanName = parsed.name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_-]/g, "")
      .substring(0, 60);

    const fileKey = `${Date.now()}_${cleanName}${parsed.ext}`;

    // Generate upload and preview URLs (expire in 1 hour)
    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: 3600 });

    const getCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
    });
    const previewUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

    // ✅ Permanent link pointing to your frontend
    const redirectLink = `https://secureshere.vercel.app/downloads?key=${fileKey}`;

    // ✅ Store direct S3 path for future re-signing
    const s3Path = `${process.env.S3_BUCKET_NAME}/${fileKey}`;

    // 🧠 Save record to Neon
    await pool.query(
      `INSERT INTO file_links (file_key, filename, content_type, redirect_link, s3_path)
       VALUES ($1, $2, $3, $4, $5)`,
      [fileKey, filename, contentType, redirectLink, s3Path]
    );

    // Respond with all useful URLs
    res.json({
      uploadUrl,       // for immediate upload
      key: fileKey,
      previewUrl,      // valid 1 hour
      redirectLink,    // permanent redirect
    });

  } catch (err) {
    console.error("Presign error:", err);
    res.status(500).json({ error: "Failed to generate presigned URL" });
  }
});

// ✅ Presign download URL (generate new short-lived link from stored s3_path)
router.get("/presign-download/:key", async (req, res) => {
  try {
    const { key } = req.params;

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ downloadUrl });
  } catch (err) {
    console.error("Presign download error:", err);
    res.status(500).json({ error: "Failed to generate presigned download URL" });
  }
});

// Secure direct download (optional)
router.get("/download/:filename", async (req, res) => {
  const { filename } = req.params;
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: filename,
    });
    const s3Response = await s3.send(command);

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", s3Response.ContentType || "application/octet-stream");

    const passThrough = new stream.PassThrough();
    s3Response.Body.pipe(passThrough).pipe(res);
  } catch (error) {
    console.error("❌ Download error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

export default router;
