const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken")

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

async function run() {
  try {
    const categoriesCollection = client
      .db("techxbazar")
      .collection("categories");
    const productsCollection = client.db("techxbazar").collection("products");
    const usersCollection = client.db("techxbazar").collection("users");

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

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
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
