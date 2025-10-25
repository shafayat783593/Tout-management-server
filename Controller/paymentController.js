// controllers/paymentController.js - FIXED VERSION
const { ObjectId } = require('mongodb');

const paymentController = {
    // Create payment intent
    createPaymentIntent: async (req, res) => {
        try {
            const { amount, bookingId, tourName, userEmail, userName } = req.body;

            console.log("💳 Creating payment intent for booking:", bookingId);

            // Validate required fields
            if (!amount || !bookingId) {
                return res.status(400).json({
                    success: false,
                    message: "Amount and bookingId are required"
                });
            }

            // Verify booking exists
            const bookingCollection = req.app.get('bookingCollection');
            const booking = await bookingCollection.findOne({
                _id: new ObjectId(bookingId)
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            // Convert amount to cents
            const amountInCents = Math.round(parseFloat(amount) * 100);

            // Generate proper Stripe-like client secret format
            const paymentIntentId = `pi_mock_${bookingId}_${Date.now()}`;
            const clientSecret = `${paymentIntentId}_secret_mock${Date.now()}`;

            console.log("💳 Generated mock payment intent:", { paymentIntentId, clientSecret });

            res.status(200).json({
                success: true,
                clientSecret: clientSecret,
                paymentIntentId: paymentIntentId,
                amount: amountInCents
            });

        } catch (error) {
            console.error("❌ Error creating payment intent:", error);
            res.status(500).json({
                success: false,
                message: "Failed to create payment intent",
                error: error.message
            });
        }
    },

    // ✅ FIXED: Confirm payment
    confirmPayment: async (req, res) => {
        try {
            const {
                transactionId,
                amount,
                status,
                bookingId,
                tourName,
                userEmail,
                userName,
                destination,
                paymentIntentId
            } = req.body;

            console.log("✅ Confirming payment for booking:", bookingId);
            console.log("📦 Payment data:", req.body);

            // Validate required fields
            if (!transactionId || !bookingId) {
                return res.status(400).json({
                    success: false,
                    message: "Transaction ID and booking ID are required"
                });
            }

            // Get collections from app settings
            const bookingCollection = req.app.get('bookingCollection');
            const paymentsCollection = req.app.get('paymentsCollection');

            if (!paymentsCollection || !bookingCollection) {
                throw new Error("Database collections not available");
            }

            // Verify booking exists
            const booking = await bookingCollection.findOne({
                _id: new ObjectId(bookingId)
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            console.log("📋 Found booking:", booking._id);

            // Create payment record
            const paymentData = {
                transactionId,
                amount: parseFloat(amount),
                currency: 'BDT',
                status: status || 'succeeded',
                bookingId: new ObjectId(bookingId),
                tourName: tourName || booking.tourName,
                userEmail: userEmail || booking.buyerEmail,
                userName: userName || booking.buyerName,
                destination: destination || booking.destination,
                paymentIntentId: paymentIntentId,
                paymentMethod: 'card',
                paymentDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            console.log("💾 Creating payment record...");

            // Insert payment into MongoDB
            const paymentResult = await paymentsCollection.insertOne(paymentData);
            const payment = { _id: paymentResult.insertedId, ...paymentData };

            console.log("✅ Payment created successfully:", paymentResult.insertedId);

            // Update booking status to 'confirmed' and mark as paid
            const updateResult = await bookingCollection.updateOne(
                { _id: new ObjectId(bookingId) },
                {
                    $set: {
                        status: 'confirmed',
                        paymentStatus: 'paid',
                        paymentId: paymentResult.insertedId.toString(),
                        transactionId: transactionId,
                        updatedAt: new Date()
                    }
                }
            );

            console.log("✅ Booking updated successfully:", updateResult.modifiedCount);

            res.status(200).json({
                success: true,
                message: "Payment confirmed successfully",
                payment: payment,
                bookingUpdated: updateResult.modifiedCount > 0
            });

        } catch (error) {
            console.error("❌ Error confirming payment:", error);
            res.status(500).json({
                success: false,
                message: "Failed to confirm payment",
                error: error.message
            });
        }
    },

    // Get payment details by ID
    getPaymentDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const paymentsCollection = req.app.get('paymentsCollection');

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment ID"
                });
            }

            const payment = await paymentsCollection.findOne({
                _id: new ObjectId(id)
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found"
                });
            }

            res.status(200).json({
                success: true,
                payment: payment
            });

        } catch (error) {
            console.error("❌ Error fetching payment details:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch payment details",
                error: error.message
            });
        }
    },

    // Get payment by booking ID
    getPaymentByBooking: async (req, res) => {
        try {
            const { bookingId } = req.params;
            const paymentsCollection = req.app.get('paymentsCollection');

            if (!ObjectId.isValid(bookingId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking ID"
                });
            }

            const payment = await paymentsCollection.findOne({
                bookingId: new ObjectId(bookingId)
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found for this booking"
                });
            }

            res.status(200).json({
                success: true,
                payment: payment
            });

        } catch (error) {
            console.error("❌ Error fetching payment by booking:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch payment",
                error: error.message
            });
        }
    },

    // Get payments by user email
    getPaymentsByUser: async (req, res) => {
        try {
            const { email } = req.params;
            const paymentsCollection = req.app.get('paymentsCollection');

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "Email is required"
                });
            }

            const payments = await paymentsCollection.find({
                userEmail: email
            }).sort({ paymentDate: -1 }).toArray();

            res.status(200).json({
                success: true,
                count: payments.length,
                payments: payments
            });

        } catch (error) {
            console.error("❌ Error fetching user payments:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch user payments",
                error: error.message
            });
        }
    },

    // Get all payments (Admin)
    getAllPayments: async (req, res) => {
        try {
            const paymentsCollection = req.app.get('paymentsCollection');
            const payments = await paymentsCollection.find().sort({ paymentDate: -1 }).toArray();

            res.status(200).json({
                success: true,
                count: payments.length,
                payments: payments
            });

        } catch (error) {
            console.error("❌ Error fetching payments:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch payments",
                error: error.message
            });
        }
    }
};

module.exports = paymentController;