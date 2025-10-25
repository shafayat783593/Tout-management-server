// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const bookingController = require('../Controller/bookingController');

// Middleware to pass collections to controller

// Booking routes
router.get('/user/:email', bookingController.getBookingsByUser); // ✅ Get bookings by user email
router.post('/', bookingController.createBooking);
router.patch('/:id/status', bookingController.updateBookingStatus);

module.exports = router;