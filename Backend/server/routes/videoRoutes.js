const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Video = require("../models/Video");
const authMiddleware = require("../middleware/authMiddleware");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/videos/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

router.post("/upload", authMiddleware, upload.single("video"), async (req, res) => {
    try {
        const { title, description, courseId } = req.body;
        const video = await Video.create({
            title,
            description,
            courseId,
            uploadedBy: req.user.id,
            filePath: req.file.path,
            originalName: req.file.originalname,
        });
        res.status(201).json(video);
    } catch (err) {
        res.status(500).json({ error: "Failed to upload video." });
    }
});

router.get("/", authMiddleware, async (req, res) => {
    try {
        const videos = await Video.find().populate("uploadedBy", "name").populate("courseId", "title");
        res.status(200).json(videos);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch videos." });
    }
});

module.exports = router;
