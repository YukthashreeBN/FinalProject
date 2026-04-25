const express = require("express");
const router = express.Router();
const BookRequest = require("../models/BookRequest");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { bookName, subject, reason } = req.body;
        const request = await BookRequest.create({
            bookName,
            subject,
            reason,
            studentId: req.user.id,
        });
        res.status(201).json(request);
    } catch (err) {
        res.status(500).json({ error: "Failed to submit book request." });
    }
});

// GET /api/book-requests/my - Fetch requests for the logged-in student
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const requests = await BookRequest.find({ studentId: req.user.id })
            .sort({ createdAt: -1 });
        res.status(200).json(requests);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch your book requests." });
    }
});

router.get("/", authMiddleware, async (req, res) => {
    try {
        const requests = await BookRequest.find().populate("studentId", "name email");
        res.status(200).json(requests);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch book requests." });
    }
});

router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const request = await BookRequest.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.status(200).json(request);
    } catch (err) {
        res.status(500).json({ error: "Failed to update book request." });
    }
});

module.exports = router;
