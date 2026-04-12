const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const authMiddleware = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// ── Rate limiter: 20 requests per minute per user ──
const { ipKeyGenerator } = require("express-rate-limit");  

require("dotenv").config();
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: (req) => req.user?.id || ipKeyGenerator(req),
    message: { reply: "Too many requests. Please wait a moment and try again." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
});

// ── POST /api/chatbot ──
router.post("/", authMiddleware, chatLimiter, async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message || typeof message !== "string" || message.trim().length === 0) {
            return res.status(400).json({ reply: "Message is required." });
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Build prompt
        const safeHistory = Array.isArray(history) ? history : [];
        const historyText = safeHistory.slice(-6).map((h) => `${h.role === "user" ? "Student" : "AI"}: ${h.content}`).join("\n");
        const fullPrompt = `You are "LiveLearn AI", an academic assistant. Keep answers under 200 words. No Markdown formatting.\n\nConversation so far:\n${historyText}\n\nStudent: ${message.trim()}\n\nAI:`;

        // Generate response
        const result = await model.generateContent(fullPrompt);
        let reply = result.response.text();
        
        // Ensure reply is clean and plain text
        reply = reply.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").trim();

        // Always return response in this format
        res.json({ reply });

    } catch (err) {
        console.error("Gemini error:", err);
        res.status(500).json({ reply: "Sorry, I'm having trouble right now. Please try again." });
    }
});

module.exports = router;
