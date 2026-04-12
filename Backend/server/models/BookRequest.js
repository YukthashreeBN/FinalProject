const mongoose = require("mongoose");

const bookRequestSchema = new mongoose.Schema(
    {
        bookName: { type: String, required: true },
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("BookRequest", bookRequestSchema);
