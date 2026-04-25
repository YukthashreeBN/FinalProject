const mongoose = require("mongoose");

const bookRequestSchema = new mongoose.Schema(
    {
        bookName: { type: String, required: true },
        subject: { type: String },
        reason: { type: String },
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: {
            type: String,
            enum: ["pending", "fulfilled", "cancelled"], // Updated to match teacher actions
            default: "pending",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("BookRequest", bookRequestSchema);
