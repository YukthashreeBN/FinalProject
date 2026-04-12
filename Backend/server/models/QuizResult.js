const mongoose = require("mongoose");

const quizResultSchema = new mongoose.Schema(
    {
        quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        score: { type: Number, required: true },
        totalQuestions: { type: Number, required: true },
        answers: [
            {
                questionIndex: { type: Number },
                selectedOption: { type: String },
                isCorrect: { type: Boolean },
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("QuizResult", quizResultSchema);
