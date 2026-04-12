const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const authMiddleware = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const User = require("../models/User");
const { sendPaymentReceipt } = require("../utils/mailer");

// POST /api/payment/create-order
router.post("/create-order", authMiddleware, async (req, res) => {
    try {
        const { courseId, courseName, amount, paymentMethod } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Valid amount is required." });
        }

        const orderId = "LL-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

        const order = await Order.create({
            orderId,
            userId: req.user.id,
            courseId: courseId || null,
            courseName: courseName || "Course Enrollment",
            amount: Number(amount),
            currency: "INR",
            status: "pending",
            paymentMethod: paymentMethod || "card",
        });

        res.status(200).json({
            orderId: order.orderId,
            amount: order.amount,
            currency: order.currency,
            courseId: order.courseId,
            status: order.status,
        });

    } catch (error) {
        console.error("Create order error:", error.message);
        res.status(500).json({ error: "Failed to create order." });
    }
});

// POST /api/payment/verify-payment
router.post("/verify-payment", authMiddleware, async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: "Order ID is required." });
        }

        // Find the order
        const order = await Order.findOne({ orderId, userId: req.user.id });
        if (!order) {
            return res.status(404).json({ error: "Order not found." });
        }

        if (order.status === "success") {
            return res.status(200).json({
                success: true,
                message: "Payment already verified.",
                transactionId: order.transactionId,
            });
        }

        // ── SIMULATE PAYMENT ──
        // For demo: always succeed. To test failures, uncomment:
        // const success = Math.random() > 0.1;
        const success = true;

        if (!success) {
            order.status = "failed";
            await order.save();
            return res.status(200).json({
                success: false,
                message: "Payment failed. Please try again.",
            });
        }

        // Mark as successful
        const transactionId = "TXN-" + uuidv4().slice(0, 12).toUpperCase();
        order.status = "success";
        order.transactionId = transactionId;
        await order.save();

        // ── SEND EMAIL RECEIPT ──
        try {
            const user = await User.findById(req.user.id);
            if (user && user.email) {
                await sendPaymentReceipt({
                    to: user.email,
                    userName: user.name,
                    courseName: order.courseName,
                    amount: order.amount,
                    currency: order.currency,
                    orderId: order.orderId,
                    transactionId: order.transactionId,
                    date: new Date().toLocaleDateString("en-IN", {
                        year: "numeric", month: "long", day: "numeric"
                    }),
                });
                order.emailSent = true;
                await order.save();
            }
        } catch (emailErr) {
            console.error("Non-fatal email error:", emailErr.message);
        }

        res.status(200).json({
            success: true,
            message: "Payment verified successfully.",
            transactionId: order.transactionId,
        });

    } catch (error) {
        console.error("Verify payment error:", error.message);
        res.status(500).json({ error: "Failed to verify payment." });
    }
});

module.exports = router;
