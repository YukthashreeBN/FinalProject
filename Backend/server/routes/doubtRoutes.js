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

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are "LiveLearn AI", an academic tutor. Answer the student's doubt logically. Keep it under 250 words. Do not use Markdown formatting.\n\nStudent question: ${questionText.trim()}\n\nAnswer:`;

        // Generate response
        const result = await model.generateContent(prompt);
        let reply = result.response.text();
        
        // Clean away any markdown traces
        reply = reply.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").trim();

        // Save to DB
        try {
            await Doubt.create({
                studentId: req.user.id,
                questionText,
                aiResponse: reply, // Stored as aiResponse in DB
            });
        } catch (dbErr) {
            console.error("DB Error:", dbErr);
        }

        // Always return response in this format
        res.json({ reply });

    } catch (err) {
        console.error("Gemini error:", err);
        res.status(500).json({ reply: "Sorry, I'm having trouble right now. Please try again." });
    }
});

// ── GET /api/doubts ──
router.get("/", authMiddleware, async (req, res) => {
    try {
        const doubts = await Doubt.find()
            .populate("studentId", "name email")
            .populate("repliedBy", "name");
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
