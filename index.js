const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");

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

    // Admin checker api
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.typeOfUser === "admin" });
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
