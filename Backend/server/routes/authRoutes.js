const express = require("express");
const router = express.Router();
const User = require("../models/User");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware")
const roleMiddleware = require("../middleware/roleMiddleware")

//Register route

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        //check if user already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        //Hash password
        const hashedPassword = await
            bcrypt.hash(password, 10);

        //Create new user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role
        });

        res.status(201).json({
            message: "User registered successfully", user
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        //check if user exists
        const user = await
            User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "invalid credentials" });
        }

        //compare password
        const isMatch = await
            bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "invalid credentials" });
        }

        //Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login Succesful",
            token,
            user: { id: user._id, name: user.name, role: user.role }
        });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/profile", authMiddleware, async (req, res) => {
    res.json({
        message: "Protected route accessed",
        user: req.user
    });
});

router.get("/admin", authMiddleware, roleMiddleware("admin"), (req, res) => {
    res.json({ message: "Welcome Admin" });
});

module.exports = router;