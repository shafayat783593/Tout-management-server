const dotenv = require('dotenv');
dotenv.config();
var admin = require("firebase-admin");
const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;
const uri = process.env.MONGODB_URI;

// var serviceAccount = require("./serviceAccountKey.json");'
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf-8")
var serviceAccount = JSON.parse(decoded)
console.log(serviceAccount)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// jwt middlewares.......................
const virefyJWT = async (req, res, next) => {
    const token = req?.headers?.authorization?.split(' ')[1]
    console.log(token)
    if (!token) return res.status(401).send({ message: "Unauthorized Accdss!" })
    // verify token using firebase admin  sdk
    try {
        const decded = await admin.auth().verifyIdToken(token)
        req.tokenEmail = decded.email
        next()
        console.log(decded)
    } catch (err) {
        console.log(err)
        return res.status(401).send({ message: "Unauthorized Accdss!" })
    }

}

async function run() {
    try {


        const tourPackageCollection = client.db("tour-package").collection("packages");
        const bookingPackageCollection = client.db("tour-package").collection("booking");

        app.get('/', (req, res) => {
            res.send('Hello World!');
        });
        // genetate jwt
        app.post("/jwt", (req, res) => {
            const user = { email: req.body.email }
            const token = jwt.sign(user, process.env.FB_SERVICE_KEY, {
                expiresIn: "7d",
            })

        })


        app.get("/updateMyPosted/:id", async (req, res) => {
            const id = req.params.id
            const quary = { _id: new ObjectId(id) }
            const result = await tourPackageCollection.findOne(quary)
            res.send(result)

        })

        app.get("/appTourPackages", async (req, res) => {
            const result = await tourPackageCollection.find().toArray()
            res.send(result)
        })
        app.get("/PackageDetails/:id", async (req, res) => {
            const id = req.params.id
            const quary = { _id: new ObjectId(id) }
            const result = await tourPackageCollection.findOne(quary)
            res.send(result)
        })
        app.get("/manageMyPackages/:email", virefyJWT, async (req, res) => {
            const decodedEmail = req.tokenEmail

            const email = req.params.email
            if (decodedEmail !== email) {
                return res.status(403).send({ mdssage: "Forbiddne Access" })
            }
            const quary = { guidEmail: email }
            console.log(quary.guidEmail)
            const result = await tourPackageCollection.find(quary).toArray()
            res.send(result)
        })
        app.get("/myBooking/:email",virefyJWT, async (req, res) => {
            const decodedEmail = req.tokenEmail

            const email = req.params.email
            if(decodedEmail !==email ){
                return res.status(403).send({ mdssage: "Forbiddne Access" })
            }
            const quary = {
                buyerEmail: email
            }
            console.log(quary.
                buyerEmail)
            const result = await bookingPackageCollection.find(quary).toArray()
            res.send(result)
        })



        app.get("/search", async (req, res) => {
            const searchQuery = req.query.q;
            console.log(searchQuery)
            searchByName = { title: { $regex: searchQuery, $options: "i" } }
            const result = await tourPackageCollection.find(searchByName).toArray();

            res.send(result);
        });


        app.post("/addTourPackages", async (req, res) => {
            const newPackage = req.body;
            const result = await tourPackageCollection.insertOne(newPackage);
            res.send(result);
        });

        app.post("/bookTourPackage", async (req, res) => {
            const bookPakage = req.body
            const result = await bookingPackageCollection.insertOne(bookPakage)
            res.send(result)

        })
        app.patch("/bookingsStatus/:id", async (req, res) => {
            const id = req.params.id

            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedTask = req.body
            const updatedDoc = {
                $set:
                    updatedTask


            }
            console.log(updatedDoc)
            const result = await bookingPackageCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        app.put("/updateTourPackages/:id", async (req, res) => {

            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            console.log(filter)
            const options = { upsert: true };
            const updatedTask = req.body
            console.log(updatedTask)
            const updateDoc = {
                $set:
                    updatedTask

            };
            const result = await tourPackageCollection.updateMany(filter, updateDoc, options)
            res.send(result)

        })

        app.delete("/deleteMyPost/:id", async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await tourPackageCollection.deleteOne(filter)
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Connected to MongoDB!");
    } catch (error) {

    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
