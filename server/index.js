import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: ["http://localhost:5173",
    "https://copy-submanager.vercel.app"],
  credentials: true
}));
app.use(express.json());


const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader === "secure_session_active") {
        next();
    } else {
        res.status(401).send({ error: "Unauthorized access! Link knowing is not enough." });
    }
};

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect(); 
    const db = client.db("SubscriptionDB");
    const singleSubCollection = db.collection("singleSubscriptions");
    const familySubCollection = db.collection("familySubscriptions");
    const getQueryById = (id) =>
      ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

   
    app.get("/all-subscriptions", authMiddleware, async (req, res) => {
      const single = await singleSubCollection.find().toArray();
      const family = await familySubCollection.find().toArray();
      res.send({ single, family });
    });

    
    app.post("/add-single", authMiddleware, async (req, res) => {
        try {
            const doc = req.body;
            const start = new Date(`${doc.startDate}T${doc.startTime}`);
            const end = new Date(start);
            
            end.setDate(end.getDate() + parseInt(doc.durationDays || 0));
            end.setHours(end.getHours() + parseInt(doc.durationHours || 0));
            
            const newDoc = {
                ...doc,
                endDate: end.toISOString(),
                durationDays: parseInt(doc.durationDays),
                durationHours: parseInt(doc.durationHours),
                createdAt: new Date()
            };
            
            const result = await singleSubCollection.insertOne(newDoc);
            res.send(result);
        } catch (err) {
            res.status(500).send({ error: "Failed to add subscription" });
        }
    });


    app.delete("/delete-sub/:id", authMiddleware, async (req, res) => {
        const id = req.params.id;
        const type = req.query.type;
        const query = getQueryById(id);
        
        let result;
        if (type === 'family') {
            result = await familySubCollection.deleteOne(query);
        } else {
            result = await singleSubCollection.deleteOne(query);
        }
        res.send(result);
    });


    app.put("/update-sub/:id", authMiddleware, async (req, res) => {
      try {
        const id = req.params.id;
        const type = req.query.type;
        const updatedData = req.body;

        const query = getQueryById(id);
        const targetCollection = type === "family" ? familySubCollection : singleSubCollection;

        let updateDoc = { ...updatedData };

        if (updatedData.startDate && updatedData.startTime) {
          const start = new Date(`${updatedData.startDate}T${updatedData.startTime}`);
          const end = new Date(start);

          end.setDate(end.getDate() + parseInt(updatedData.durationDays || 0, 10));
          end.setHours(end.getHours() + parseInt(updatedData.durationHours || 0, 10));

          updateDoc.endDate = end.toISOString();
        }

        const result = await targetCollection.updateOne(query, {
          $set: updateDoc,
        });

        res.send(result);

      } catch (err) {
        res.status(500).send({ error: "Update Failed" });
      }
    });

 
    app.put("/renew-sub/:id", authMiddleware, async (req, res) => {
      try {
        const id = req.params.id;
        const type = req.query.type;
        const { startDate, startTime, durationDays, durationHours } = req.body; 
        
        const query = getQueryById(id);
        const targetCollection = type === "family" ? familySubCollection : singleSubCollection;
        
        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(start);
        end.setDate(end.getDate() + parseInt(durationDays || 30));
        end.setHours(end.getHours() + parseInt(durationHours || 0));

        const result = await targetCollection.updateOne(query, {
          $set: {
            startDate,
            startTime,
            durationDays: parseInt(durationDays || 30),
            durationHours: parseInt(durationHours || 0),
            endDate: end.toISOString(),
            renewedAt: new Date()
          },
        });

        res.send({ success: true, result });
      } catch (err) {
        res.status(500).send({ error: "Renew Failed" });
      }
    });

    app.post("/add-family", authMiddleware, async (req, res) => {
        try {
            const doc = req.body;
            const start = new Date(`${doc.startDate}T${doc.startTime}`);
            const end = new Date(start);
            
            end.setDate(end.getDate() + parseInt(doc.durationDays || 0));
            end.setHours(end.getHours() + parseInt(doc.durationHours || 0));
            
            const newDoc = {
                ...doc,
                endDate: end.toISOString(),
                durationDays: parseInt(doc.durationDays),
                durationHours: parseInt(doc.durationHours),
                createdAt: new Date()
            };
            
            const result = await familySubCollection.insertOne(newDoc);
            res.send(result);
        } catch (err) {
            res.status(500).send({ error: "Failed to add family subscription" });
        }
    });


    app.get("/family-subscriptions", authMiddleware, async (req, res) => {
        const result = await familySubCollection.find().toArray();
        res.send(result);
    });


    app.post('/import-data', authMiddleware, async (req, res) => {
        try {
            const payload = req.body;
            const isFamilyRecord = (record = {}) =>
                !!record.managerEmail || 
                Array.isArray(record.familyMembers) || 
                Array.isArray(record.members) || 
                record.type === "family";

            const normalizeRecord = (item) => {
                const { _id, id, ...rest } = item;
                const durationDays = parseInt(rest.durationDays || 0, 10);
                const durationHours = parseInt(rest.durationHours || 0, 10);
                const startDate = rest.startDate;
                const startTime = rest.startTime || "00:00";

                let endDate = rest.endDate;
                if (!endDate && startDate) {
                    const start = new Date(`${startDate}T${startTime}`);
                    if (!Number.isNaN(start.getTime())) {
                        const end = new Date(start);
                        end.setDate(end.getDate() + durationDays);
                        end.setHours(end.getHours() + durationHours);
                        endDate = end.toISOString();
                    }
                }

                return {
                    ...rest,
                    durationDays,
                    durationHours,
                    createdAt: new Date(rest.createdAt || new Date()),
                    endDate: endDate || new Date().toISOString(),
                    email: rest.email || "no-email@provided.com" 
                };
            };

            let singleToInsert = [];
            let familyToInsert = [];

            if (Array.isArray(payload)) {
                payload.forEach(item => {
                    if (isFamilyRecord(item)) {
                        familyToInsert.push(normalizeRecord(item));
                    } else {
                        singleToInsert.push(normalizeRecord(item));
                    }
                });
            } else if (payload && typeof payload === "object") {
                const rawSingle = payload.single || payload.singleSubscriptions || [];
                const rawFamily = payload.family || payload.familySubscriptions || [];
                singleToInsert = rawSingle.map(normalizeRecord);
                familyToInsert = rawFamily.map(normalizeRecord);
            }

            let singleCount = 0;
            let familyCount = 0;

            if (singleToInsert.length > 0) {
                const result = await singleSubCollection.insertMany(singleToInsert);
                singleCount = result.insertedCount;
            }

            if (familyToInsert.length > 0) {
                const result = await familySubCollection.insertMany(familyToInsert);
                familyCount = result.insertedCount;
            }

            if (singleCount === 0 && familyCount === 0) {
                return res.status(400).send({ error: "No valid records found to import." });
            }

            res.status(200).send({
                success: true,
                message: "Import Successful",
                singleCount,
                familyCount
            });

        } catch (err) {
            res.status(500).send({ error: "Import Failed: " + err.message });
        }
    });

    console.log("Successfully connected to MongoDB!");
    
    // Start server after MongoDB connection is established
    app.get("/", (req, res) => {
      res.send("Subscription Server is running...");
    });

    app.listen(port, () => {
      console.log(`Server running on port: ${port}`);
    });
  } finally {

  }
}
run().catch(console.dir);