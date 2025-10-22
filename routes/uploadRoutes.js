//uploadroute.js (Corrected)
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import path from "path"; // Make sure path is imported

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // === THE FIX ===
    // 1. Parse the original filename
    const parsedName = path.parse(req.file.originalname);
    const publicId = parsedName.name; // e.g., "ERICK JOSHUA OTIENO- CV"
    const format = parsedName.ext.substring(1); // e.g., "docx" (remove the ".")
    // === END FIX ===

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          // === UPDATED OPTIONS ===
          resource_type: "auto", // ✅ Still correct: auto-detect image/video/raw
          public_id: publicId, // ✅ Set the base name
          format: format, // ✅ Explicitly provide the file extension
          unique_filename: false, // ✅ Honor your original setting
          // === END UPDATED OPTIONS ===
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // The result.secure_url will now be correct
    // e.g., .../raw/upload/v12345/ERICK JOSHUA OTIENO- CV.docx
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Download route (unchanged, it's correct)
router.get("/download", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "No URL provided" });
    return res.redirect(url);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

export default router;