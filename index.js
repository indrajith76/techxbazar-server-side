const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

// middleware
app.use(cors());
app.use(express.json());

// middleware for verify
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.0iqyqsv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// middleware for verify
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const categoriesCollection = client
      .db("techxbazar")
      .collection("categories");
    const productsCollection = client.db("techxbazar").collection("products");
    const usersCollection = client.db("techxbazar").collection("users");
    const ordersCollection = client.db("techxbazar").collection("orders");
    const paymentsCollection = client.db("techxbazar").collection("payments");
    const reportsCollection = client.db("techxbazar").collection("reports");

    // verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.typeOfUser !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      next();
    };

    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    // all products of category
    app.get("/category/:id", async (req, res) => {
      const categoryId = req.params.id;
      const query = { _id: ObjectId(categoryId) };
      const { name } = await categoriesCollection.findOne(query);

      const newQuery = { category: name.toLowerCase() };
      const products = await productsCollection.find(newQuery).toArray();

      res.send({ name, products });
    });

    // add product
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    // my products
    app.get("/myProducts", async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail: email };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // latest products
    app.get("/latestProducts", async (req, res) => {
      const query = {};
      const soldQuery = { isSold: true };
      const soldProduct = await productsCollection.findOne(soldQuery);
      const result = await productsCollection.find(query).sort({ dateOfPost: 1 }).toArray();
      const filter = result.filter((product) => product.isSold !== soldProduct.isSold).slice(0,3);
      res.send(filter);
    });

    // advertise product
    app.get("/advertiseProducts", async (req, res) => {
      const query = { isAdvertise: true };

      const soldQuery = { isSold: true };
      const soldProduct = await productsCollection.findOne(soldQuery);
      const result = await productsCollection.find(query).toArray();
      const filter = result.filter((product) => product.isSold !== soldProduct.isSold).slice(0,3);
      res.send(filter);
    });

    // advertise products
    app.put("/myProducts", async (req, res) => {
      const id = req.query.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          isAdvertise: true,
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // delete products
    app.delete("/myProducts", async (req, res) => {
      const id = req.query.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // stripe payment get way
    app.post("/create-payment-intent", async (req, res) => {
      const order = req.body;
      const price = order.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.orderId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updateResult = await ordersCollection.updateOne(filter, updatedDoc);

      const productId = payment.productId;
      const productFilter = { _id: ObjectId(productId) };
      const updatedProductDoc = {
        $set: {
          isSold: true,
        },
      };
      const updateProduct = await productsCollection.updateOne(
        productFilter,
        updatedProductDoc
      );

      res.send(result);
    });

    // jwt api
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1hr",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    // get sellers
    app.get("/allSellers", async (req, res) => {
      const query = { typeOfUser: "seller" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // get buyers
    app.get("/allBuyers", async (req, res) => {
      const query = { typeOfUser: "buyer" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // delete buyer
    app.delete("/allBuyers", async (req, res) => {
      const deleteEmail = req.query.email;
      const query = { email: deleteEmail };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // get users
    app.get("/allUsers", async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // post user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const userQuery = { email: user.email };
      const storedUser = await usersCollection.findOne(userQuery);
      if (storedUser) {
        res.send({ message: "User Available" });
        return;
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // delete user
    app.delete("/deleteUser", async (req, res) => {
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Admin checker api
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.typeOfUser === "admin" });
    });

    // make admin
    app.put("/makeAdmin", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          typeOfUser: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // Seller checker api
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.typeOfUser === "seller" });
    });

    // delete seller
    app.delete("/deleteSeller", async (req, res) => {
      const email = req.query.email;
      const queryOfSellerProducts = { sellerEmail: email };
      const sellerProduct = await productsCollection.deleteMany(
        queryOfSellerProducts
      );

      const sellerQuery = { email: email };
      const resultSeller = await usersCollection.deleteOne(sellerQuery);
      res.send(resultSeller);
    });

    // verify seller
    app.put("/verifySeller", async (req, res) => {
      const email = req.query.email;
      const filterSeller = { email: email };
      const queryOfSellerProducts = { sellerEmail: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          isVerified: true,
        },
      };
      const productsResult = await productsCollection.updateMany(
        queryOfSellerProducts,
        updatedDoc,
        options
      );
      const sellerResult = await usersCollection.updateOne(
        filterSeller,
        updatedDoc,
        options
      );
      res.send(sellerResult);
    });

    // Buyer checker api
    app.get("/users/buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.typeOfUser === "buyer" });
    });

    // Buyer order add
    app.post("/myOrders", async (req, res) => {
      const product = req.body;
      const result = await ordersCollection.insertOne(product);
      res.send(result);
    });

    // myOrders of buyers
    app.get("/myOrders", async (req, res) => {
      const email = req.query.email;
      const query = { buyerEmail: email };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/myOrders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.findOne(query);
      res.send(order);
    });

    // mybuyers api for seller
    app.get("/myBuyers", async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail: email };
      const result = await ordersCollection.find(query).toArray();

      const defaultQuery = {};
      const userResult = await usersCollection.find(defaultQuery).toArray();

      const filterBuyer = result.filter(
        (user) => !userResult.includes(user.email)
      );

      res.send(filterBuyer);
    });

    // report post
    app.post("/reports", async (req, res) => {
      const report = req.body;
      const result = await reportsCollection.insertOne(report);
      res.send(result);
    });

    // report get
    app.get("/reports", async (req, res) => {
      const query = {};
      const result = await reportsCollection.find(query).toArray();
      res.send(result);
    });
  } finally {
  }
}

run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("Welcome to TECHXBazar");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
