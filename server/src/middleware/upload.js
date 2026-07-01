import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

// Save uploaded files to the /uploads folder with a random, safe name.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

// Used for a single file sent as the "file" field.
export const uploadFile = multer({ storage }).single("file");
