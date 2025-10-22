//uploadroute.js (Final Fix for Uniqueness)
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import path from "path"; // Make sure path is imported
import axios from "axios";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // 1. Parse the original filename and extension
    const parsedName = path.parse(req.file.originalname);
    const baseName = parsedName.name; // e.g., "ERICK JOSHUA OTIENO- CV"
    const format = parsedName.ext.substring(1); // e.g., "docx"

    // 2. Sanitize the base name for use in a URL/Public ID
    // Removes non-alphanumeric characters (except - and _) and replaces spaces with underscores
    const sanitizedBaseName = baseName
      .toLowerCase()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-z0-9_-]/g, '') // Remove all other special characters
      .substring(0, 60); // Keep it reasonably short

    // 3. Generate a UNQIUE Public ID by prepending a timestamp
    const timestamp = Date.now();
    const uniquePublicId = `${timestamp}_${sanitizedBaseName}`;
    // e.g., "1709283600000_erick_joshua_otieno-cv"

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          // === THE FINAL, SAFE OPTIONS ===
          resource_type: "auto", // Automatically detects type (image, video, raw)
          public_id: uniquePublicId, // Guaranteed unique ID
          format: format, // Explicitly preserves the extension (e.g., "docx")
          unique_filename: false, // We don't need Cloudinary to make it unique, we did it above
          // === END SAFE OPTIONS ===
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // The result.secure_url will now contain the unique public ID and correct extension
    // e.g., .../raw/upload/v12345/1709283600000_erick_joshua_otieno-cv.docx
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Download route (correct)
router.get("/download", async (req, res) => {
  try {
    const { url, filename } = req.query;
    if (!url || !filename) {
      return res.status(400).json({ error: "URL and filename are required" });
    }

    // Fetch the file from Cloudinary as a stream
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    // Set headers to force download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers['content-type']);

    // Pipe the file stream to the client
    response.data.pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

export default router;