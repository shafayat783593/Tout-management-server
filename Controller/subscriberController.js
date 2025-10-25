// controllers/subscriberController.js
const Subscriber = require("../models/Subscriber");

const subscribe = async (req, res) => {
    try {
        console.log("📩 [subscribe] req.body =", req.body);

        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        // normalize
        const normalized = email.toLowerCase().trim();

        // Check existing
        const existing = await Subscriber.findOne({ email: normalized });
        console.log("🔍 [subscribe] existing =", existing);

        if (existing) {
            return res.status(200).json({
                success: false,
                message: "Already subscribed",
            });
        }

        const subscriber = new Subscriber({ email: normalized });
        await subscriber.save();

        console.log("✅ [subscribe] saved:", subscriber);
        return res.status(201).json({
            success: true,
            message: "Subscribed successfully",
            subscriber
        });
    } catch (err) {
        console.error("❌ [subscribe] Error subscribing:", err);
        // send error message back so frontend sees details (optional)
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: err.message
        });
    }
};

const getAllSubscribers = async (req, res) => {
    try {
        const subscribers = await Subscriber.find().sort({ subscribedAt: -1 });
        res.status(200).json({ success: true, count: subscribers.length, subscribers });
    } catch (err) {
        console.error("❌ [getAllSubscribers] Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
    }
};

const unsubscribe = async (req, res) => {
    try {
        const { email } = req.params;
        const deleted = await Subscriber.findOneAndDelete({ email: email.toLowerCase() });
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Subscriber not found" });
        }
        res.status(200).json({ success: true, message: "Unsubscribed successfully" });
    } catch (err) {
        console.error("❌ [unsubscribe] Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
    }
};

module.exports = { subscribe, getAllSubscribers, unsubscribe };
