const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const Video = require("../models/Video");
const Doubt = require("../models/Doubt");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/overview", authMiddleware, roleMiddleware(["teacher", "admin"]), async (req, res) => {
    try {
        const teacherId = req.user.id;

        // Active Classes (Courses by this teacher)
        const courses = await Course.find({ createdBy: teacherId });
        const activeClasses = courses.length;

        // Total Students (Sum of enrolled students across all courses)
        let totalStudents = 0;
        const uniqueStudents = new Set();
        courses.forEach(course => {
            if (course.enrolledStudents && course.enrolledStudents.length > 0) {
                course.enrolledStudents.forEach(studentId => {
                    uniqueStudents.add(studentId.toString());
                });
            }
        });
        totalStudents = uniqueStudents.size;

        // Notes Uploaded
        const Note = require("../models/Note");
        const notesUploaded = await Note.countDocuments({ uploadedBy: teacherId });

        // Pending Doubts (Assuming doubts aren't tied to a specific teacher or course, 
        // we'll just show all global pending doubts, or if they are just doubts without a teacher reply)
        const pendingDoubtsCount = await Doubt.countDocuments({ teacherReply: { $exists: false } });

        // Recent Doubts (up to 5 pending doubts)
        const recentDoubts = await Doubt.find({ teacherReply: { $exists: false } })
            .populate("studentId", "name email")
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            activeClasses,
            totalStudents,
            notesUploaded,
            pendingDoubtsCount,
            recentDoubts
        });
    } catch (error) {
        console.error("Teacher overview error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;
