const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    courseId: {
        type: String,       // Can be ObjectId ref to Course, or string for demo
        default: null,
    },
    courseName: {
        type: String,
        default: "Unknown Course",
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: "INR",
    },
    status: {
        type: String,
        enum: ["pending", "success", "failed"],
        default: "pending",
    },
    transactionId: {
        type: String,
        default: null,
    },
    paymentMethod: {
        type: String,
        default: "card",
    },
    emailSent: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
