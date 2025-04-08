const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('Using connection string:', uri.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs
    await client.connect();
    console.log('Connected successfully!');
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Ping successful! Your credentials are working!");
    
    // Try to list databases to verify full access
    const dbs = await client.db().admin().listDatabases();
    console.log('Available databases:', dbs.databases.map(db => db.name));
    
  } catch (error) {
    console.error('Connection error:', error.message);
    if (error.message.includes('Authentication failed')) {
      console.log('Authentication failed - please check your username and password');
    }
  } finally {
    await client.close();
  }
}

testConnection().catch(console.dir); 