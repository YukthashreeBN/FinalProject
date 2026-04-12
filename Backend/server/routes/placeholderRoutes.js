/**
 * placeholderRoutes.js
 * Dummy routes for features not yet implemented:
 * - Chatbot (AI response)
 * - Payments (create order, verify)
 * - Admin-specific endpoints (pending teachers, approve/reject, payment logs)
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

// ─── Chatbot ──────────────────────────────────────────────────────────────────
// NOTE: POST /api/chatbot is now handled by routes/chatbotRoutes.js (Gemini integration)

// ─── Payments ─────────────────────────────────────────────────────────────────
// POST /api/create-order
router.post("/create-order", authMiddleware, (req, res) => {
    const { courseId, amount } = req.body;
    res.status(200).json({
        orderId: "LL-" + Date.now(),
        amount: amount || 0,
        currency: "INR",
        courseId: courseId || null,
    });
});

// POST /api/verify-payment
router.post("/verify-payment", authMiddleware, (req, res) => {
    // Always succeeds for demo purposes
    res.status(200).json({
        success: true,
        message: "Payment verified successfully!",
    });
});

// ─── Admin ────────────────────────────────────────────────────────────────────
const authMiddlewareAdmin = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// GET /api/admin/users  – wraps the real /api/users route logic here for simpler URL
router.get("/admin/users", authMiddlewareAdmin, roleMiddleware("admin"), async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json({ users });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users." });
    }
});

// GET /api/admin/teachers/pending  – returns teachers with pending approval
// (No approval field in User model yet, so returns all teachers as "pending" for demo)
router.get("/admin/teachers/pending", authMiddlewareAdmin, roleMiddleware("admin"), async (req, res) => {
    try {
        const teachers = await User.find({ role: "teacher" }).select("-password");
        const formatted = teachers.map(t => ({
            id: t._id,
            name: t.name,
            email: t.email,
            subject: "General",
            experience: "N/A",
            status: "pending",
        }));
        res.status(200).json({ teachers: formatted });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch pending teachers." });
    }
});

// POST /api/admin/teacher/:id/approve
router.post("/admin/teacher/:id/approve", authMiddlewareAdmin, roleMiddleware("admin"), (req, res) => {
    res.status(200).json({ success: true, message: "Teacher approved successfully." });
});

// POST /api/admin/teacher/:id/reject
router.post("/admin/teacher/:id/reject", authMiddlewareAdmin, roleMiddleware("admin"), (req, res) => {
    res.status(200).json({ success: true, message: "Teacher rejected." });
});

// GET /api/admin/payments – dummy payment log
router.get("/admin/payments", authMiddlewareAdmin, roleMiddleware("admin"), (req, res) => {
    res.status(200).json({
        payments: [
            { orderId: "LL-001", student: "Demo Student", course: "Sample Course", amount: "₹999", status: "success", date: new Date().toISOString().slice(0, 10) },
        ],
    });
});

module.exports = router;
