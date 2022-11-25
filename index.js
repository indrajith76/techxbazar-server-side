const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

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
