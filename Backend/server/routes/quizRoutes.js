const express = require("express");
const router = express.Router();
const Quiz = require("../models/Quiz");
const QuizResult = require("../models/QuizResult");
const authMiddleware = require("../middleware/authMiddleware");

// Create Quiz
router.post("/create", authMiddleware, async (req, res) => {
    try {
        const quiz = await Quiz.create({
            ...req.body,
            createdBy: req.user.id,
        });
        res.status(201).json(quiz);
    } catch (err) {
        res.status(500).json({ error: "Failed to create quiz." });
    }
});

// Get all quizzes
router.get("/", async (req, res) => {
    try {
        const quizzes = await Quiz.find({}, "-questions.correctAnswer").populate("courseId", "title");
        res.status(200).json(quizzes);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch quizzes." });
    }
});

// Get full quiz for taking (includes correct answers for client-side grading)
router.get("/:id/take", authMiddleware, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id).populate("courseId", "title");
        if (!quiz) return res.status(404).json({ error: "Quiz not found" });
        res.status(200).json(quiz);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch quiz." });
    }
});

// Get quiz questions by ID (hiding correct answers — for preview/listing)
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id, "-questions.correctAnswer").populate("courseId", "title");
        if (!quiz) return res.status(404).json({ error: "Quiz not found" });
        res.status(200).json(quiz);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch quiz." });
    }
});

// Submit Quiz answers
router.post("/:id/submit", authMiddleware, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: "Quiz not found" });

        const studentAnswers = req.body.answers || []; // array of { questionIndex, selectedOption }
        let score = 0;
        const finalAnswers = [];

        quiz.questions.forEach((q, idx) => {
            const studentAns = studentAnswers.find((ans) => ans.questionIndex === idx);
            const isCorrect = studentAns && studentAns.selectedOption === q.correctAnswer;
            if (isCorrect) score += 1;

            finalAnswers.push({
                questionIndex: idx,
                selectedOption: studentAns ? studentAns.selectedOption : null,
                isCorrect: isCorrect || false,
            });
        });

        const result = await QuizResult.create({
            quizId: quiz._id,
            studentId: req.user.id,
            score,
            totalQuestions: quiz.questions.length,
            answers: finalAnswers,
        });

        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to submit quiz." });
    }
});

module.exports = router;
