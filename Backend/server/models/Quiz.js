const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        questions: [
            {
                questionText: { type: String, required: true },
                options: [{ type: String, required: true }],
                correctAnswer: { type: String, required: true },
            },
        ],
        timeLimit: { type: Number, default: 300 }, // in seconds
    },
    { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
