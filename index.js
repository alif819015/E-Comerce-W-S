const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
// stripe secret key get
const stripe = require('stripe')(process.env.STRIPE_SECRET);
// require id for delete
const ObjectId = require('mongodb').ObjectId;
//----app use----- 
const app = express();
const port = process.env.PORT || 5000;

// middle ware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gqter.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// console.log(uri);
async function run() {
    try {
        await client.connect();
        const database = client.db('Wish_Collection');
        const productsCollection = database.collection('products');
        const categoriesCollection = database.collection('categories');
        const ordersCollection = database.collection('orders');
        const reviewCollection = database.collection('review');
        const usersCollection = database.collection('users');


        // ----------------Get all Categoris-------------------
        app.get('/categories', async (req, res) => {
            const cursor = categoriesCollection.find({});
            const result = await cursor.toArray();
            res.json(result);
        });

        // ------------------------Products section-----------------
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const result = await cursor.toArray();
            res.json(result);
        });
        // ---single products------
        app.get("/products/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
        });
        // post product
        app.post('/products', async (req, res) => {
            const service = req.body;
            const result = await productsCollection.insertOne(service);
            console.log(result);
            res.json(result)
        });
        /////delete product
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            console.log('deleted id', result);
            res.json(result);
        });

        // ---------------------------------Orders section-----------------------

        //get users orders from database
        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.json(orders);
        });

        // get data for nav bar cart
        app.get('/orders/cart', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.json(orders);
        });

        // dleted user for my order review page btn

        app.delete('/orders/:email', async (req, res) => {
            const id = req.params.email;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            console.log('deleted id', result);
            res.json(result);
        });


        // post order info to orders collection
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            console.log('post succ', result)
            res.json(result);
        });

        // ---------manage All orders section------

        // get customers order in the my review page
        app.get('/orders/all', async (req, res) => {
            const cursor = ordersCollection.find({});
            const users = await cursor.toArray();
            res.send(users);
        });

        // dleted users order from manage all order page
        app.delete('/orders/all/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            console.log('deleted id', result);
            res.json(result);
        });

        // user update from server to show 
        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.send(result);
            // ai part er pore data ta /5000/users/id te pabo 
        });

        // -----------------review section-------------------

        // add single review post to database
        app.post('/review', async (req, res) => {
            const service = req.body;
            // console.log('hit the post api', service);
            const result = await reviewCollection.insertOne(service);
            console.log(result);
            res.json(result)
        });

        // get all review data
        app.get('/review', async (req, res) => {
            const cursor = reviewCollection.find({});
            const result = await cursor.toArray();
            res.json(result);
        });

        //  -----------------users get post and admin section--------------------

        //register users data post to the new data collection
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        //get google user data
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        // post admin data in users database
        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const updateDoc = { $set: { role: 'admin' } };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.json(result);
        });

        // get special admin from users database
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        });

        //    ---------------Payment Section started---------------
        // define payment data get for stripe payments
        app.post('/create-payment-intent', async (req, res) => {
            const paymentInfo = req.body;
            const paymentAmount = parseInt(paymentInfo?.cost)
            const amount = paymentAmount * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                payment_method_types: ['card']
            });
            res.json({ clientSecret: paymentIntent.client_secret })
        });

        //---put api
        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment
                }
            }
            const result = await ordersCollection.updateOne(filter, updateDoc);
            res.json(result)
        });


    }
    finally {
        //-- await client.close();
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Wish_Collection connected')
});

app.listen(port, () => {
    console.log('server is running at the port', port);
})