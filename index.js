const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const dotenv = require("dotenv");
var cors = require('cors')
dotenv.config()

const express = require('express');
const app = express();
app.use(express.json())
app.use(cors())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const port = process.env.PORT;
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1]
    // console.log(token);
    if (!authHeader) {
        return res.status(401).json({ message: "unauthorized" })
    }
    if (!token) {
        return res.status(401).json({ message: 'unauthorized' })
    }
    try {
        const { payload } = await jwtVerify(token, JWKS)
        console.log(payload);
        next()
    } catch {
        return res.status(403).json({ message: "Forbidden" })
    }

}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const db = client.db("wanderlust");
        const destinationCollection = db.collection("destination");
        const bookingCollection = db.collection('bookings')

        app.get("/destinations", async (req, res) => {
            const result = await destinationCollection.find().toArray();
            res.send(result)
        })

        app.post("/destinations", async (req, res) => {
            const destinationData = req.body;
            // console.log(destinationData, 'destrination data from frontend');
            const result = await destinationCollection.insertOne(destinationData);
            res.send(result)
        })

        app.get("/destinations/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await destinationCollection.findOne(query);
            res.send(result)
        })

        app.patch('/destinations/:id', async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;
            // console.log(updatedData);
            const query = {
                _id: new ObjectId(id)
            }
            const result = await destinationCollection.updateOne(
                query, { $set: updatedData }
            );
            res.send(result)
        })

        app.get("/booking/:userId", verifyToken, async (req, res) => {
            const userId = req.params.userId;
            const result = await bookingCollection.find({ userId: userId }).toArray();
            res.send(result)
        })

        app.post("/booking", verifyToken, async (req, res) => {
            const bookingData = req.body;
            const result = await bookingCollection.insertOne(bookingData);
            res.send(result)
        })

        app.delete("/booking/:bookingId", verifyToken, async (req, res) => {
            const { bookingId } = req.params;
            const result = await bookingCollection.deleteOne({ _id: new ObjectId(bookingId) });
            res.send(result)
        })

        app.delete("/destinations/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const result = await destinationCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Server is running Fine!")
})

app.listen(port, "0.0.0.0", () => {

    console.log(`Server is running on ${port}`);
})