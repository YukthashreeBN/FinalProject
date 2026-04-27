const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const course = await Course.create({
      title: req.body.title,
      description: req.body.description,
      youtubePlaylistId: req.body.youtubePlaylistId || "",
      createdBy: req.user.id,
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const query = {
      createdBy: req.user.id,
      title: { $regex: search, $options: "i" }
    };

    const courses = await Course.find(query)
      .populate("createdBy", "name email")
      .skip(skip)
      .limit(limit)
      .sort({ [req.query.sort || "createdAt"]: -1 });

    const total = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      total,
      count: courses.length,
      data: courses
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Ownership check
    if (course.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await course.deleteOne();

    res.json({ message: "Course deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const course = await
      Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    course.title = req.body.title || course.title;
    course.description = req.body.description || course.description;
    course.youtubePlaylistId = req.body.youtubePlaylistId !== undefined ? req.body.youtubePlaylistId : course.youtubePlaylistId;

    await course.save();

    res.json(course);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all courses (public view)
router.get("/all", async (req, res) => {
  try {
    const courses = await Course.find().populate("createdBy", "name");
    res.status(200).json(courses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Enroll in a course
router.post("/:id/enroll", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    // Prevent duplicate enrollment
    if (!course.enrolledStudents.includes(req.user.id)) {
      course.enrolledStudents.push(req.user.id);
      await course.save();
    }
    res.status(200).json({ message: "Successfully enrolled", course });
  } catch (err) {
    res.status(500).json({ error: "Failed to enroll in course" });
  }
});

// Get courses where user is enrolled
router.get("/enrolled", authMiddleware, async (req, res) => {
  try {
    const courses = await Course.find({ enrolledStudents: req.user.id }).populate("createdBy", "name");
    res.status(200).json(courses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch enrolled courses" });
  }
});

module.exports = router;