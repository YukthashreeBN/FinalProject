const express = require("express");
const router = express.Router();
const Doubt = require("../models/Doubt");
const authMiddleware = require("../middleware/authMiddleware");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// ── POST /api/doubts ──
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { questionText } = req.body;

        if (!questionText || typeof questionText !== "string" || questionText.trim().length === 0) {
            return res.status(400).json({ reply: "Question text is required." });
        }

        // ── Step 1: Save doubt to DB FIRST so it always appears on the teacher dashboard ──
        let savedDoubt;
        try {
            savedDoubt = await Doubt.create({
                studentId: req.user.id,
                questionText: questionText.trim(),
            });
        } catch (dbErr) {
            console.error("DB Error saving doubt:", dbErr);
            return res.status(500).json({ reply: "Failed to save your doubt. Please try again." });
        }

        // ── Step 2: Return success response ──
        res.json({ reply: "Your doubt has been submitted to the teacher.", doubtId: savedDoubt._id });

    } catch (err) {
        console.error("Doubt route error:", err);
        res.status(500).json({ reply: "Sorry, something went wrong. Please try again." });
    }
});

// ── GET /api/doubts ──
router.get("/", authMiddleware, async (req, res) => {
    try {
        let query = {};
        // If the user is a student, only return their own doubts
        if (req.user.role === "student") {
            query.studentId = req.user.id;
        }

        const doubts = await Doubt.find(query)
            .populate("studentId", "name email")
            .populate("repliedBy", "name")
            .sort({ createdAt: 1 }); // Sort oldest first so chat flows naturally
        res.status(200).json(doubts);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch doubts." });
    }
});

// ── PUT /api/doubts/:id/reply ──
router.put("/:id/reply", authMiddleware, async (req, res) => {
    try {
        const doubt = await Doubt.findByIdAndUpdate(
            req.params.id,
            {
                teacherReply: req.body.reply,
                repliedBy: req.user.id,
            },
            { new: true }
        );
        res.status(200).json(doubt);
    } catch (err) {
        res.status(500).json({ error: "Failed to reply to doubt." });
    }
});

module.exports = router;
