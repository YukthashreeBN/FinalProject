const mongoose = require("mongoose");

const bookRecommendationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    author: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    recommendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("BookRecommendation", bookRecommendationSchema);
