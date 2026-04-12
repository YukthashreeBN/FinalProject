const express = require("express");
const router = express.Router();
const BookRequest = require("../models/BookRequest");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { bookName } = req.body;
        const request = await BookRequest.create({
            bookName,
            studentId: req.user.id,
        });
        res.status(201).json(request);
    } catch (err) {
        res.status(500).json({ error: "Failed to submit book request." });
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
