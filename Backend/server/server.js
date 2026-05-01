const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const courseRoutes = require("./routes/courseRoutes");
const authRoutes = require("./routes/authRoutes");
const noteRoutes = require("./routes/noteRoutes");
const videoRoutes = require("./routes/videoRoutes");
const quizRoutes = require("./routes/quizRoutes");
const doubtRoutes = require("./routes/doubtRoutes");
const bookRequestRoutes = require("./routes/bookRequestRoutes");
const userRoutes = require("./routes/userRoutes");

const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const bookRecommendationRoutes = require("./routes/bookRecommendationRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploads as static directories
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/doubts", doubtRoutes);
app.use("/api/book-requests", bookRequestRoutes);
app.use("/api/users", userRoutes);

app.use("/api/payment", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/book-recommendations", bookRecommendationRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
    res.send("LiveLearn Plus Backend Running!");
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.log(err));