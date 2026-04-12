const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Video = require("../models/Video");
const Course = require("../models/Course");
const Notification = require("../models/Notification");
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

        // Trigger Notifications for enrolled students
        try {
            const course = await Course.findById(courseId);
            if (course && course.enrolledStudents && course.enrolledStudents.length > 0) {
                const notifications = course.enrolledStudents.map(studentId => ({
                    recipient: studentId,
                    type: "VIDEO_UPLOAD",
                    title: "New Video Uploaded",
                    message: `A new video "${title}" has been added to your course: ${course.title}`,
                    referenceId: video._id
                }));
                await Notification.insertMany(notifications);
            }
        } catch (notifErr) {
            console.error("Failed to create notifications:", notifErr);
        }

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

// Get videos for a specific course
router.get("/course/:courseId", authMiddleware, async (req, res) => {
    try {
        const videos = await Video.find({ courseId: req.params.courseId })
                                   .populate("uploadedBy", "name")
                                   .sort({ createdAt: 1 });
        res.status(200).json(videos);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch course videos." });
    }
});

module.exports = router;
