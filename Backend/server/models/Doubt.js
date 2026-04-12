const mongoose = require("mongoose");

const doubtSchema = new mongoose.Schema(
    {
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        questionText: { type: String, required: true },
        aiResponse: { type: String },
        teacherReply: { type: String },
        repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Doubt", doubtSchema);
