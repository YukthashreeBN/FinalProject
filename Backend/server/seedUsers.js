const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('Connected to MongoDB');

        const password = await bcrypt.hash('password123', 10);

        const users = [
            // Admin
            { name: 'Super Admin', email: 'admin@livelearn.com', password, role: 'admin' },
            
            // Students
            { name: 'Rahul Student', email: 'rahul@student.com', password, role: 'student' },
            { name: 'Priya Student', email: 'priya@student.com', password, role: 'student' },
            { name: 'Arjun Student', email: 'arjun@student.com', password, role: 'student' },
            { name: 'Neha Student', email: 'neha@student.com', password, role: 'student' },
            
            // Teachers (Active)
            { name: 'Dr. Sharma', email: 'sharma@teacher.com', password, role: 'teacher', status: 'active', subject: 'Mathematics', experience: '15 years' },
            { name: 'Prof. Verma', email: 'verma@teacher.com', password, role: 'teacher', status: 'active', subject: 'Physics', experience: '10 years' },
            
            // Teachers (Pending)
            { name: 'Amit New', email: 'amit@teacher.com', password, role: 'teacher', status: 'pending', subject: 'Chemistry', experience: '5 years' },
            { name: 'Sneha New', email: 'sneha@teacher.com', password, role: 'teacher', status: 'pending', subject: 'Biology', experience: '3 years' },
            
            // Teachers (Rejected)
            { name: 'Ravi Reject', email: 'ravi@teacher.com', password, role: 'teacher', status: 'rejected', subject: 'English', experience: '1 year' },
        ];

        for (const u of users) {
            const exists = await User.findOne({ email: u.email });
            if (!exists) {
                await User.create(u);
                console.log(`Created user: ${u.email} (${u.role})`);
            } else {
                console.log(`User already exists: ${u.email}`);
            }
        }

        console.log('Database seeding complete!');
        process.exit();
    } catch (error) {
        console.error('Error with database seeding', error);
        process.exit(1);
    }
};

seedUsers();
