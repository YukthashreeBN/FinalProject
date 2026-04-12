const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Note = require("../models/Note");
const authMiddleware = require("../middleware/authMiddleware");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/notes/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
    try {
        const { title, courseId } = req.body;
        const note = await Note.create({
            title,
            courseId,
            uploadedBy: req.user.id,
            filePath: req.file.path,
            originalName: req.file.originalname,
        });
        res.status(201).json(note);
    } catch (err) {
        res.status(500).json({ error: "Failed to upload note." });
    }
});

router.get("/", authMiddleware, async (req, res) => {
    try {
        const notes = await Note.find().populate("uploadedBy", "name").populate("courseId", "title");
        res.status(200).json(notes);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch notes." });
    }
});

module.exports = router;
