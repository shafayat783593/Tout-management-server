// controllers/bookingController.js
const { ObjectId } = require('mongodb');

const bookingController = {
    // Get bookings by user email
    getBookingsByUser: async (req, res) => {
        try {
            const { email } = req.params;
            const bookingCollection = req.app.get('bookingCollection');

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "Email is required"
                });
            }

            const bookings = await bookingCollection.find({
                buyerEmail: email
            }).sort({ createdAt: -1 }).toArray();

            res.status(200).json({
                success: true,
                count: bookings.length,
                bookings: bookings
            });

        } catch (error) {
            console.error("❌ Error fetching user bookings:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch user bookings",
                error: error.message
            });
        }
    },

    // Add other booking-related methods here
    // For example:
    createBooking: async (req, res) => {
        try {
            const bookingCollection = req.app.get('bookingCollection');
            const bookingData = {
                ...req.body,
                createdAt: new Date(),
                status: 'pending',
                paymentStatus: 'unpaid'
            };

            const result = await bookingCollection.insertOne(bookingData);

            res.status(201).json({
                success: true,
                message: "Booking created successfully",
                booking: { _id: result.insertedId, ...bookingData }
            });

        } catch (error) {
            console.error("❌ Error creating booking:", error);
            res.status(500).json({
                success: false,
                message: "Failed to create booking",
                error: error.message
            });
        }
    },

    // Update booking status
    updateBookingStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const bookingCollection = req.app.get('bookingCollection');

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking ID"
                });
            }

            const result = await bookingCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        status: status,
                        updatedAt: new Date()
                    }
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            res.status(200).json({
                success: true,
                message: "Booking status updated successfully",
                modifiedCount: result.modifiedCount
            });

        } catch (error) {
            console.error("❌ Error updating booking status:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update booking status",
                error: error.message
            });
        }
    }
};

module.exports = bookingController;