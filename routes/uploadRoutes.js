import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

// use memory storage (no temp files)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Upload route (handles images, pdfs, docs, zips, etc.)
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Detect file type (image vs others)
    const isImage = req.file.mimetype.startsWith("image/");

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: isImage ? "image" : "raw", // ✅ handle all file types
          use_filename: true,                       // ✅ keep original file name
          unique_filename: false,                   // ✅ no random name
          public_id: req.file.originalname.split(".")[0], // optional, cleaner URLs
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // ✅ Return Cloudinary file URL
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ✅ Download route (redirects to Cloudinary file)
router.get("/download", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    // Option 1: Just redirect to Cloudinary-hosted file
    return res.redirect(url);

    // Option 2 (optional): Force direct download
    // const response = await fetch(url);
    // res.setHeader("Content-Disposition", "attachment; filename=file");
    // response.body.pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

export default router;
