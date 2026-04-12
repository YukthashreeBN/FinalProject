const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        filePath: { type: String, required: true },
        originalName: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
