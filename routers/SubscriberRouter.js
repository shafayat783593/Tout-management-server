// routes/newsletterRoutes.js
const express = require("express");
const { subscribe, getAllSubscribers, unsubscribe } = require("../Controller/subscriberController");

const router = express.Router();

router.post("/subscribe", subscribe);
router.get("/all", getAllSubscribers);
router.delete("/unsubscribe/:email", unsubscribe);

module.exports = router;
