const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/Course");
const Order = require("../models/Order");
const Video = require("../models/Video");
const Note = require("../models/Note");
const QuizResult = require("../models/QuizResult");
const Doubt = require("../models/Doubt");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Ensure only admin can access these routes
router.use(authMiddleware);
router.use(roleMiddleware("admin"));

// GET /api/admin/users → list all users
router.get("/users", async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 }); // Exclude password for security
        res.json({ users });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// DELETE /api/admin/users/:id → delete a user
router.delete("/users/:id", async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// GET /api/admin/courses → list all courses
router.get("/courses", async (req, res) => {
    try {
        const courses = await Course.find().populate("createdBy", "name email").sort({ createdAt: -1 });
        res.json({ courses });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// DELETE /api/admin/courses/:id → delete any course
router.delete("/courses/:id", async (req, res) => {
    try {
        const course = await Course.findByIdAndDelete(req.params.id);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        res.json({ message: "Course deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// GET /api/admin/teachers/pending → list pending teacher approvals
router.get("/teachers/pending", async (req, res) => {
    try {
        const teachers = await User.find({ role: "teacher", status: "pending" }).select("-password").sort({ createdAt: -1 });
        res.json({ teachers });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// POST /api/admin/teacher/:id/approve → approve teacher
router.post("/teacher/:id/approve", async (req, res) => {
    try {
        const teacher = await User.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true });
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });
        res.json({ message: "Teacher approved successfully", teacher });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// POST /api/admin/teacher/:id/reject → reject teacher
router.post("/teacher/:id/reject", async (req, res) => {
    try {
        const teacher = await User.findByIdAndUpdate(req.params.id, { status: "rejected" }, { new: true });
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });
        res.json({ message: "Teacher rejected successfully", teacher });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// GET /api/admin/payments → list all payments
router.get("/payments", async (req, res) => {
    try {
        const payments = await Order.find().populate("userId", "name email").sort({ createdAt: -1 });
        
        let totalAmount = 0;
        const formattedPayments = payments.map(p => {
            if (p.status === 'success') {
                totalAmount += p.amount;
            }
            return {
                orderId: p.orderId,
                student: p.userId ? p.userId.name : 'Unknown User',
                course: p.courseName,
                amount: `${p.currency} ${p.amount}`,
                status: p.status,
                date: p.createdAt
            };
        });

        res.json({ payments: formattedPayments, totalAmount });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// GET /api/admin/overview → get real-time stats and recent payments
router.get("/overview", async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: "student" });
        const activeTeachers = await User.countDocuments({ role: "teacher", status: "active" });
        const activeCourses = await Course.countDocuments();
        
        const successfulOrders = await Order.find({ status: "success" });
        const totalRevenue = successfulOrders.reduce((sum, order) => sum + order.amount, 0);

        const recentPaymentsRaw = await Order.find({ status: "success" })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("userId", "name");

        const recentPayments = recentPaymentsRaw.map(p => ({
            student: p.userId ? p.userId.name : "Unknown User",
            course: p.courseName,
            amount: p.amount
        }));

        res.json({
            stats: {
                totalStudents,
                activeTeachers,
                activeCourses,
                totalRevenue
            },
            recentPayments
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// GET /api/admin/activity → get platform activity stats
router.get("/activity", async (req, res) => {
    try {
        const videosUploaded = await Video.countDocuments();
        const notesUploaded = await Note.countDocuments();
        const quizzesAttempted = await QuizResult.countDocuments();
        const doubtsSolved = await Doubt.countDocuments({ teacherReply: { $exists: true, $ne: "" } });

        // Calculate new user registrations for the last 5 days
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        const registrations = [];
        for (let i = 4; i >= 0; i--) {
            const startOfDay = new Date(today);
            startOfDay.setDate(today.getDate() - i);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(today);
            endOfDay.setDate(today.getDate() - i);
            endOfDay.setHours(23, 59, 59, 999);

            const count = await User.countDocuments({
                createdAt: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            // Format day name, e.g., 'Mon'
            const dayName = startOfDay.toLocaleDateString('en-US', { weekday: 'short' });
            registrations.push({ day: dayName, count });
        }

        res.json({
            contentStats: {
                videosUploaded,
                notesUploaded,
                quizzesAttempted,
                doubtsSolved
            },
            newUsers: registrations
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;
