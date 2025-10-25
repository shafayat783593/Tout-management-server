const dotenv = require('dotenv');
dotenv.config();
var admin = require("firebase-admin");
const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const userRoutes = require("./routers/userRoutes");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bookingRoutes = require("./routers/bookingRoutes");
const paymentRoutes = require("./routers/PaymentRoutes"); // নতুন line
const newsletterRouter = require('./routers/SubscriberRouter'); // <- correct path & name

const aiRoutes = require('./routers/aiChat');
const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

// CORRECTED MONGODB URI
const uri = "mongodb+srv://tour-package:y1D7SulT9rdMjJLy@cluster0.idrxcge.mongodb.net/tour-package?retryWrites=true&w=majority&appName=Cluster0";

console.log("🔗 Connecting to MongoDB...");

// Firebase Admin SDK initialization
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf-8")
var serviceAccount = JSON.parse(decoded)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// MongoDB Client Setup
// ✅ Use Mongoose instead of MongoClient
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

// JWT middleware
const verifyJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).send({ message: "Unauthorized Access! No token provided" });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).send({ message: "Unauthorized Access! Invalid token format" });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        req.tokenEmail = decodedToken.email;
        next();
    } catch (error) {
        console.error("JWT verification error:", error);
        return res.status(401).send({ message: "Unauthorized Access! Invalid or expired token" });
    }
};

// Basic route
app.get('/', (req, res) => {
    res.send('Tour Management Server is Running!');
});

// Generate JWT
app.post("/jwt", (req, res) => {
    const user = { email: req.body.email }
    const token = jwt.sign(user, process.env.FB_SERVICE_KEY, {
        expiresIn: "7d",
    })
    res.send({ token });
})

async function run() {
    try {
        await client.connect();

        // Initialize collections
        const tourPackageCollection = client.db("tour-package").collection("packages");
        const bookingPackageCollection = client.db("tour-package").collection("booking");

        const usersCollection = client.db("tour-package").collection("users"); // Add users collection
        const paymentsCollection = client.db("tour-package").collection("payments");
        const subscriptionCollection = client.db("tour-package").collection("subscription");
        const aiChatCollection = client.db("tour-package").collection("AiChat"); // Correct variable name





        app.set('bookingCollection', bookingPackageCollection);
        app.set('tourPackageCollection', tourPackageCollection);
        app.set('usersCollection', usersCollection);
        app.set('paymentsCollection', paymentsCollection); //
        app.set('subscriptionCollection', subscriptionCollection);
        app.set('aiChatCollection', aiChatCollection);

        console.log("✅ Connected to MongoDB collections:");
        console.log("   - packages collection");
        console.log("   - booking collection");
        console.log("   - users collection"); // Add this line
        console.log("   - payments collection");
        // ============ TOUR PACKAGES API ============

        // Get all packages (for admin management)
        app.get("/allPackages", async (req, res) => {
            try {
                const packages = await tourPackageCollection.find().sort({ createdAt: -1 }).toArray();
                res.json(packages);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch packages' });
            }
        });

        // Get all packages for public
        app.get("/appTourPackages", async (req, res) => {
            try {
                const result = await tourPackageCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch packages' });
            }
        });

        // Get single package by ID
        app.get("/PackageDetails/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: 'Invalid package ID' });
                }
                const query = { _id: new ObjectId(id) };
                const result = await tourPackageCollection.findOne(query);
                if (!result) {
                    return res.status(404).json({ error: 'Package not found' });
                }
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch package' });
            }
        });

        // Get package for update
        app.get("/updateMyPosted/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: 'Invalid package ID' });
                }
                const query = { _id: new ObjectId(id) };
                const result = await tourPackageCollection.findOne(query);
                if (!result) {
                    return res.status(404).json({ error: 'Package not found' });
                }
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch package' });
            }
        });

        // Get user's packages
        app.get("/manageMyPackages/:email", verifyJWT, async (req, res) => {
            try {
                const decodedEmail = req.tokenEmail;
                const email = req.params.email;

                if (decodedEmail !== email) {
                    return res.status(403).send({ message: "Forbidden Access" });
                }

                const query = { guidEmail: email };
                const result = await tourPackageCollection.find(query).sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch packages' });
            }
        });

        // Search packages
        app.get("/search", async (req, res) => {
            try {
                const searchQuery = req.query.q;

                if (!searchQuery || searchQuery.trim() === "") {
                    const allTours = await tourPackageCollection.find({}).toArray();
                    return res.send(allTours);
                }

                const searchConditions = {
                    $or: [
                        { tourName: { $regex: searchQuery, $options: "i" } },
                        { destination: { $regex: searchQuery, $options: "i" } },
                        { guidname: { $regex: searchQuery, $options: "i" } }
                    ]
                };

                const results = await tourPackageCollection.find(searchConditions).toArray();
                res.send(results);
            } catch (error) {
                console.error("Search error:", error);
                res.status(500).send({ error: "Internal server error" });
            }
        });

        // Get special offers
        app.get("/spacialOffer", async (req, res) => {
            try {
                const query = {
                    $or: [
                        { specialPackage: true },
                        { specialPackage: "yes" },
                        { discount: { $exists: true, $ne: null, $gt: 0 } }
                    ]
                };
                const result = await tourPackageCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch special offers' });
            }
        });

        // Create new tour package
        app.post("/addTourPackages", async (req, res) => {
            try {
                const newPackage = {
                    ...req.body,
                    createdAt: new Date(),
                    status: req.body.status || 'active',
                    bookingCount: 0
                };
                const result = await tourPackageCollection.insertOne(newPackage);
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to create package' });
            }
        });

        // Update tour package
        app.put("/updateTourPackages/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: 'Invalid package ID' });
                }

                const filter = { _id: new ObjectId(id) };
                const options = { upsert: true };
                const updatedData = {
                    ...req.body,
                    updatedAt: new Date()
                };

                const updateDoc = {
                    $set: updatedData
                };

                const result = await tourPackageCollection.updateOne(filter, updateDoc, options);
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to update package' });
            }
        });

        // Update package status
        app.patch("/updatePackageStatus/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: 'Invalid package ID' });
                }

                const filter = { _id: new ObjectId(id) };
                const { status } = req.body;

                if (!status || !['active', 'inactive'].includes(status)) {
                    return res.status(400).json({ error: 'Invalid status value' });
                }

                const updateDoc = {
                    $set: {
                        status: status,
                        updatedAt: new Date()
                    }
                };

                const result = await tourPackageCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to update package status' });
            }
        });

        // Update tour package (alternative endpoint)
        app.put("/updateTourPackage/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: 'Invalid package ID' });
                }

                const filter = { _id: new ObjectId(id) };
                const updatedData = {
                    ...req.body,
                    updatedAt: new Date()
                };

                const result = await tourPackageCollection.updateOne(
                    filter,
                    { $set: updatedData },
                    { upsert: false }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({ error: 'Package not found' });
                }

                res.json({
                    message: 'Package updated successfully',
                    modifiedCount: result.modifiedCount
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to update package' });
            }
        });

        // Delete user's package
        app.delete("/deleteMyPost/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: 'Invalid package ID' });
                }

                const filter = { _id: new ObjectId(id) };
                const result = await tourPackageCollection.deleteOne(filter);

                if (result.deletedCount === 0) {
                    return res.status(404).json({ error: 'Package not found' });
                }

                res.json({
                    message: 'Package deleted successfully',
                    deletedCount: result.deletedCount
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to delete package' });
            }
        });

        // Delete any package (admin)
        app.delete("/deletePackage/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: 'Invalid package ID' });
                }

                const filter = { _id: new ObjectId(id) };
                const result = await tourPackageCollection.deleteOne(filter);

                if (result.deletedCount === 0) {
                    return res.status(404).json({ error: 'Package not found' });
                }

                res.json({
                    message: 'Package deleted successfully',
                    deletedCount: result.deletedCount
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to delete package' });
            }
        });

        // ============ BOOKING API ============

        // Get user's bookings
        app.get("/myBooking/:email", async (req, res) => {
            try {
                const decodedEmail = req.tokenEmail;
                const email = req.params.email;

                if (decodedEmail !== email) {
                    return res.status(403).send({ message: "Forbidden Access" });
                }

                const query = { buyerEmail: email };
                const result = await bookingPackageCollection.find(query).sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch bookings' });
            }
        });

        // Create booking
        app.post("/bookTourPackage", async (req, res) => {
            try {
                const bookPackage = {
                    ...req.body,
                    createdAt: new Date(),
                    status: 'pending'
                };
                const result = await bookingPackageCollection.insertOne(bookPackage);
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to create booking' });
            }
        });

        // Update booking count
        app.patch("/bookingCount/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: 'Invalid package ID' });
                }

                const filter = { _id: new ObjectId(id) };
                const updatedDoc = {
                    $inc: { bookingCount: 1 },
                    $set: { updatedAt: new Date() }
                };

                const result = await tourPackageCollection.updateOne(filter, updatedDoc);
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to update booking count' });
            }
        });

        // Update booking status
        app.patch("/bookingsStatus/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: 'Invalid booking ID' });
                }

                const filter = { _id: new ObjectId(id) };
                const updatedTask = req.body;
                const updatedDoc = {
                    $set: {
                        ...updatedTask,
                        updatedAt: new Date()
                    }
                };

                const result = await bookingPackageCollection.updateOne(filter, updatedDoc);
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to update booking status' });
            }
        });

        // ===================== ADMIN BOOKING MANAGEMENT =====================

        // Get all bookings (Public - No token required)
        app.get("/allBookings", async (req, res) => {
            console.log("📥 Fetching all bookings from database...");
            try {
                const bookings = await bookingPackageCollection.find().sort({ createdAt: -1 }).toArray();

                // Format response according to your data structure
                const formattedBookings = bookings.map(booking => ({
                    _id: booking._id,
                    tourId: booking.tourId,
                    tourName: booking.tourName,
                    price: booking.price,
                    buyerName: booking.buyerName,
                    buyerEmail: booking.buyerEmail,
                    contactNo: booking.contactNo,
                    departureLocation: booking.departureLocation,
                    destination: booking.destination,
                    bookingDate: booking.bookingDate,
                    specialNote: booking.specialNote,
                    status: booking.status,
                    createdAt: booking.createdAt,
                    updatedAt: booking.updatedAt
                }));

                res.json({
                    success: true,
                    count: bookings.length,
                    bookings: formattedBookings
                });
            } catch (error) {
                console.error("❌ Error fetching all bookings:", error);
                res.status(500).json({
                    success: false,
                    message: "Failed to fetch bookings",
                    error: error.message
                });
            }
        });

        // Get booking statistics
        app.get("/bookingStats", async (req, res) => {
            try {
                const total = await bookingPackageCollection.countDocuments();
                const pending = await bookingPackageCollection.countDocuments({ status: "pending" });
                const confirmed = await bookingPackageCollection.countDocuments({ status: "confirmed" });
                const cancelled = await bookingPackageCollection.countDocuments({ status: "cancelled" });
                const completed = await bookingPackageCollection.countDocuments({ status: "completed" });

                // Calculate total revenue
                const revenueResult = await bookingPackageCollection.aggregate([
                    {
                        $match: {
                            status: { $in: ["confirmed", "completed"] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: {
                                $sum: {
                                    $convert: { input: "$price", to: "double", onError: 0 }
                                }
                            }
                        }
                    }
                ]).toArray();

                const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

                res.json({
                    success: true,
                    stats: {
                        total,
                        pending,
                        confirmed,
                        cancelled,
                        completed,
                        totalRevenue
                    },
                });
            } catch (error) {
                console.error("❌ Error fetching booking stats:", error);
                res.status(500).json({
                    success: false,
                    message: "Failed to fetch booking statistics",
                    error: error.message
                });
            }
        });

        // Update booking status
        app.patch("/updateBookingStatus/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const { status } = req.body;

                console.log(`🔄 Updating booking ${id} to status: ${status}`);

                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid booking ID"
                    });
                }

                if (!status || !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid status value"
                    });
                }

                const result = await bookingPackageCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            status: status,
                            updatedAt: new Date()
                        }
                    }
                );

                if (result.modifiedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Booking not found"
                    });
                }

                res.json({
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
        });

        // Test endpoint to check database connection
        app.get("/test-db", async (req, res) => {
            try {
                const packageCount = await tourPackageCollection.countDocuments();
                const bookingCount = await bookingPackageCollection.countDocuments();

                res.json({
                    success: true,
                    message: "Database connection successful",
                    stats: {
                        packages: packageCount,
                        bookings: bookingCount
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: "Database connection failed",
                    error: error.message
                });
            }
        });

        await client.db("admin").command({ ping: 1 });
        console.log("✅ Connected to MongoDB successfully!");
    } catch (error) {
        console.error("❌ Failed to connect to MongoDB:", error);
    }
}













// Get all users (Admin only)
app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });

        res.json({
            success: true,
            message: "Users fetched successfully",
            count: users.length,
            users: users
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            error: error.message
        });
    }
});

// Get user booking count
app.get("/userBookingsCount/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const bookingCount = await bookingPackageCollection.countDocuments({
            buyerEmail: email
        });

        res.json({
            success: true,
            count: bookingCount
        });
    } catch (error) {
        console.error("Error fetching user booking count:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booking count",
            error: error.message
        });
    }
});

// Update user role
app.patch("/api/users/:id/role", async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'admin', 'guide'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role value"
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { role: role },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "User role updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update user role",
            error: error.message
        });
    }
});

// Delete user
app.delete("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "User deleted successfully",
            user: deletedUser
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete user",
            error: error.message
        });
    }
});





// Get single booking by ID
app.get("/api/bookings/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID"
            });
        }

        const booking = await bookingPackageCollection.findOne({
            _id: new ObjectId(id)
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        res.json({
            success: true,
            booking: booking
        });
    } catch (error) {
        console.error("❌ Error fetching booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booking",
            error: error.message
        });
    }
});



// Get users with booking and revenue statistics
app.get("/api/bookings/admin/users-with-stats", async (req, res) => {
    try {
        const usersCollection = req.app.get('usersCollection');
        const bookingCollection = req.app.get('bookingCollection');
        const paymentsCollection = req.app.get('paymentsCollection');

        // Get all users
        const users = await usersCollection.find().sort({ createdAt: -1 }).toArray();
        const allBookings = await bookingCollection.find().toArray();
        const allPayments = await paymentsCollection.find().toArray();

        // Process user statistics
        const usersWithStats = await Promise.all(
            users.map(async (user) => {
                const userBookings = allBookings.filter(booking =>
                    booking.buyerEmail === user.email
                );
                const userPayments = allPayments.filter(payment =>
                    payment.userEmail === user.email
                );

                const totalRevenue = userPayments
                    .filter(payment => payment.status === 'succeeded')
                    .reduce((sum, payment) => sum + (payment.amount || 0), 0);

                return {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    photo: user.photo,
                    role: user.role,
                    createdAt: user.createdAt,
                    bookingCount: userBookings.length,
                    totalRevenue: totalRevenue
                };
            })
        );

        const overallStats = {
            totalUsers: users.length,
            totalAdmins: users.filter(u => u.role === 'admin').length,
            totalGuides: users.filter(u => u.role === 'guide').length
        };

        res.json({
            success: true,
            users: usersWithStats,
            overallStats: overallStats
        });

    } catch (error) {
        console.error("❌ Error fetching users with stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user statistics",
            error: error.message
        });
    }
});



// Get payment statistics
app.get("/api/payments/stats", async (req, res) => {
    try {
        const paymentsCollection = req.app.get('paymentsCollection');
        const payments = await paymentsCollection.find().toArray();

        const paymentStats = {
            totalPayments: payments.length,
            successfulPayments: payments.filter(p => p.status === 'succeeded').length,
            failedPayments: payments.filter(p => p.status === 'failed').length,
            pendingPayments: payments.filter(p => p.status === 'pending').length,
            totalRevenue: payments
                .filter(p => p.status === 'succeeded')
                .reduce((sum, p) => sum + (p.amount || 0), 0)
        };

        res.json({
            success: true,
            stats: paymentStats
        });

    } catch (error) {
        console.error("❌ Error fetching payment stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment statistics",
            error: error.message
        });
    }
});












// Routes
// Add this with your other routes
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes); // এই line যোগ করুন
app.use("/api/payments", paymentRoutes);
app.use("/api/newsletter", newsletterRouter);


// Add with your other routes
app.use('/api/ai', aiRoutes);
// Run the server
run().catch(console.dir);

app.listen(port, () => {
    console.log(`🚀 Tour Management Server listening on port ${port}`);
});



















