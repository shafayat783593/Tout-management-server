const User = require("../models/UserModels"); // User model import করুন

const saveAllUser = async (req, res) => {
    try {
        console.log("Request body:", req.body);

        const { name, email, photo, role } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and email are required"
            });
        }

        // Check if user already exists in MongoDB
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        console.log("Existing user:", existingUser);

        if (existingUser) {
            return res.status(200).json({
                message: "User already exists",
                user: existingUser,
            });
        }

        // Create new user in MongoDB
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase(),
            photo: photo || '',
            role: role || "user",
        });

        console.log("New user to save:", newUser);

        const savedUser = await newUser.save();
        console.log("Saved user:", savedUser);

        res.status(201).json({
            message: "User registered successfully in MongoDB",
            user: savedUser,
        });
    } catch (err) {
        console.error("❌ Error saving user to MongoDB:", err);
        console.error("Error details:", err.message);
        console.error("Error stack:", err.stack);

        // Handle duplicate key error
        if (err.code === 11000) {
            return res.status(400).json({
                message: "User with this email already exists"
            });
        }

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(error => error.message);
            return res.status(400).json({
                message: "Validation error",
                errors: errors
            });
        }

        res.status(500).json({
            message: "Internal Server Error",
            error: err.message
        });
    }
};

// Get all users from MongoDB
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.status(200).json({
            message: "Users fetched successfully",
            count: users.length,
            users: users
        });
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({
            message: "Internal Server Error",
            error: err.message
        });
    }
};

// Get single user by email
const getUserByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "User fetched successfully",
            user: user
        });
    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({
            message: "Internal Server Error",
            error: err.message
        });
    }
};



// ✅ Get Role by Email (useful for frontend)
const getUserRoleByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ email: email.toLowerCase() }).select("role");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ role: user.role });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update user profile
const updateUser = async (req, res) => {
    try {
        const { email } = req.params;
        const { name, photo, role } = req.body;

        console.log("🔄 Update request for:", email);

        // Validate input
        if (!name && !photo && !role) {
            return res.status(400).json({
                success: false,
                message: "At least one field (name, photo, or role) is required to update"
            });
        }

        // Build update object
        const updateFields = {};
        if (name) {
            if (name.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: "Name must be at least 2 characters long"
                });
            }
            updateFields.name = name.trim();
        }

        if (photo !== undefined) {
            updateFields.photo = photo;
        }

        if (role) {
            if (!['user', 'admin', 'guide'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: "Role must be one of: user, admin, guide"
                });
            }
            updateFields.role = role;
        }

        // Update user
        const updatedUser = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { $set: updateFields },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (err) {
        console.error("❌ Error updating user:", err);

        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(error => error.message);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: err.message
        });
    }
};
module.exports = {
    saveAllUser,
    getAllUsers,
    getUserByEmail,
    updateUser,
    getUserRoleByEmail
};