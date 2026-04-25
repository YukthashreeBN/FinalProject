const express = require("express");
const router = express.Router();
const BookRecommendation = require("../models/BookRecommendation");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// POST /api/book-recommendations - Teacher recommends a book
router.post("/", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
    try {
        const { title, author, subject } = req.body;
        const recommendation = await BookRecommendation.create({
            title,
            author,
            subject,
            recommendedBy: req.user.id,
        });
        res.status(201).json(recommendation);
    } catch (err) {
        res.status(500).json({ error: "Failed to create recommendation." });
    }
});

// GET /api/book-recommendations - Fetch all recommendations (Student view)
router.get("/", authMiddleware, async (req, res) => {
    try {
        const recommendations = await BookRecommendation.find()
            .populate("recommendedBy", "name")
            .sort({ createdAt: -1 });
        res.status(200).json(recommendations);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch recommendations." });
    }
});

module.exports = router;
