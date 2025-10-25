






const express = require("express");
const router = express.Router();
const { aiChatResponse, getAiChat } = require("../Controller/aiController");

// POST - Send message + get AI reply
router.post("/chat", aiChatResponse);

// GET - Fetch previous messages
router.get("/history", getAiChat);

module.exports = router;
