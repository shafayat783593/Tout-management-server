const mongoose = require('mongoose');

const aiChatSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    email: { type: String, required: true },
    messages: [
        {
            sender: { type: String, enum: ['user', 'bot'], required: true },
            text: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('AIChat', aiChatSchema);
