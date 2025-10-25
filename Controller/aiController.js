const { GoogleGenerativeAI } = require("@google/generative-ai");
const AIChat = require("../models/AiChatModel");
const axios = require("axios");
require("dotenv").config();

const genAI = new GoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || "AIzaSyBArj0hP3bdZkKe6HHMSl2sbi3yBOwG9Uc",
});

// ✅ Fetch + clean live website text
const getWebsiteText = async (url) => {
    try {
        const res = await axios.get(url);
        const html = res.data;

        const cleanText = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        return cleanText || "No readable text found on the website.";
    } catch (err) {
        console.error("❌ Error fetching website:", err.message);
        return "Failed to fetch website content.";
    }
};

// ✅ POST → Handle AI Chat (send + save)
const aiChatResponse = async (req, res) => {
    try {
        const { message, userId, email } = req.body;

        if (!message)
            return res.status(400).json({ error: "Missing message" });
        if (!userId || !email)
            return res.status(400).json({ error: "Missing userId or email" });

        const siteUrl = "https://tour-management-c1ca2.web.app/";
        const siteText = await getWebsiteText(siteUrl);

        // 🧠 Prepare the AI prompt
        const prompt = `
      You are an AI travel assistant for a Tour Management website.
      Use this website info to answer accurately:

      --- WEBSITE CONTEXT START ---
      ${siteText.substring(0, 6000)}
      --- WEBSITE CONTEXT END ---

      User asked: "${message}"

      Respond briefly and helpfully about tours, travel, and packages.
    `;

        // 🪄 Generate AI response
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const aiReply = result.response.text();

        // ✅ Find existing chat or create a new one
        let chat = await AIChat.findOne({ userId, email });

        if (!chat) {
            chat = new AIChat({ userId, email, messages: [] });
        }

        // ✅ Push both user and AI messages
        chat.messages.push({ sender: "user", text: message });
        chat.messages.push({ sender: "bot", text: aiReply });

        await chat.save();

        res.json({ success: true, reply: aiReply, chat });
    } catch (err) {
        console.error("❌ AI Chat Error:", err);
        res.status(500).json({ success: false, message: "AI chat error" });
    }
};

// ✅ GET → Fetch chat history
const getAiChat = async (req, res) => {
    const { userId, email } = req.query;
    if (!userId || !email)
        return res.status(400).json({ error: "userId and email required" });

    try {
        const chat = await AIChat.findOne({ userId, email });
        res.json(chat || { messages: [] });
    } catch (err) {
        console.error("❌ Error fetching chat history:", err);
        res.status(500).json({ error: "Server error" });
    }
};

module.exports = { aiChatResponse, getAiChat };
