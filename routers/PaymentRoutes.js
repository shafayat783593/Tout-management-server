// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../Controller/paymentController');

// Middleware to pass collections to controller
const attachCollections = (req, res, next) => {
    next();
};

// Payment routes
router.post('/create-intent', attachCollections, paymentController.createPaymentIntent);
router.post('/confirm', attachCollections, paymentController.confirmPayment);
router.get('/user/:email', attachCollections, paymentController.getPaymentsByUser); // ✅ Get payments by user email
router.get('/:id', attachCollections, paymentController.getPaymentDetails);
router.get('/booking/:bookingId', attachCollections, paymentController.getPaymentByBooking);
router.get('/', attachCollections, paymentController.getAllPayments);

module.exports = router;