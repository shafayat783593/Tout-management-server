const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"],
    },
    subscribedAt: {
        type: Date,
        default: Date.now,
    },
});

const Subscriber = mongoose.model("Subscriber", subscriberSchema);
module.exports = Subscriber;
