import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

// use memory storage (no temp files)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload route
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "auto" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ✅ Download route
router.get("/download", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    // Option 1: Redirect user to Cloudinary hosted file
    return res.redirect(url);

    // Option 2 (optional): stream file content directly
    // const response = await fetch(url);
    // response.body.pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

export default router;
