const express = require("express");
const {
    saveAllUser,
    getAllUsers,
    getUserByEmail,
    updateUser,
    getUserRoleByEmail
} = require("../Controller/userController");

const router = express.Router();

// Save a new user
router.post("/register", saveAllUser);

// Get all users
router.get("/", getAllUsers);

// ✅ IMPORTANT: এইটা আগে রাখো
router.get("/role/:email", getUserRoleByEmail);

// Get user by email
router.get("/:email", getUserByEmail);

// Update user by email
router.put("/:email", updateUser);

module.exports = router;
