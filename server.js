require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set Mongoose to use strict query and stable API
mongoose.set('strictQuery', true);

// MongoDB Connection with retry logic
const connectDB = async () => {
  // Use either the environment variable or the .env file
  const mongoURI = process.env.PROJECT_MONGODB_URI || process.env.MONGODB_URI;
  
  try {
    await mongoose.connect(mongoURI, {
      dbName: 'pastasDB_v2',
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      }
    });
    console.log('Successfully connected to MongoDB Atlas!');
    await initializeDatabase();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Define Pasta Schema
const pastaSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  wins: { type: Number, default: 0 },
  plays: { type: Number, default: 0 }
});

// Define Snapshot Schema
const snapshotSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  rankings: [{
    name: String,
    wins: Number,
    plays: Number,
    winRate: Number,
    rank: Number
  }]
});

const Pasta = mongoose.model('Pasta', pastaSchema);
const Snapshot = mongoose.model('Snapshot', snapshotSchema, 'snapshots');

// Initialize Database if Empty
async function initializeDatabase() {
  try {
    const count = await Pasta.countDocuments();
    if (count === 0) {
      const pastaNames = [
        "SPAGHETTI",
        "FETTUCCINE",
        "LINGUINE",
        "PAPPARDELLE",
        "CAPELLINI",
        "BUCATINI",
        "PENNE",
        "FUSILLI",
        "FARFALLE",
        "ORECCHIETTE",
        "GEMELLI",
        "RIGATONI",
        "ZITI",
        "MACARONI",
        "DITALINI",
        "ORZO",
        "PACCHERI",
        "CASARECCE",
        "PICCI",
        "TAGLIATELLE",
        "MAFALDE",
        "CONCHIGLIONI",
        "CAMPANELLE",
        "CAVATAPPI",
        "MEZZE_MANICHE",
        "PIPE_RIGATE",
        "RADIATORI",
        "ROTINI",
        "RUOTE"
      ];

      // Use Promise.all with findOneAndUpdate for each pasta
      await Promise.all(pastaNames.map(name => 
        Pasta.findOneAndUpdate(
          { name },
          { name, wins: 0, plays: 0 },
          { upsert: true, new: true }
        )
      ));
      
      console.log("Database initialized with pasta types.");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Connect to MongoDB
connectDB();

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Add routes for both root and /pasta-roulette
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/pasta-roulette', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/history.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

// Handle Voting Logic
io.on("connection", async (socket) => {
  console.log("A user connected");

  async function sendNewPastaPair() {
    try {
      // Get all pastas with timeout
      const allPastas = await Promise.race([
        Pasta.find().exec(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database operation timed out')), 5000)
        )
      ]);
      
      console.log(`Found ${allPastas.length} total pastas in database`);
      
      // Shuffle the array using Fisher-Yates algorithm
      for (let i = allPastas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPastas[i], allPastas[j]] = [allPastas[j], allPastas[i]];
      }

      // Take first two pastas (they're now randomly selected)
      const pasta1 = allPastas[0];
      const pasta2 = allPastas[1];

      // Double check that they're not the same pasta
      if (pasta1.name === pasta2.name) {
        console.log('Same pasta type selected, retrying...');
        return sendNewPastaPair();
      }

      console.log(`Selected pasta pair: ${pasta1.name} (${pasta1._id}) vs ${pasta2.name} (${pasta2._id})`);
      socket.emit("newPair", [pasta1, pasta2]);
    } catch (error) {
      console.error("Error fetching pasta pair:", error);
      socket.emit("error", "Failed to get pasta options");
    }
  }

  socket.on("requestHistoricalData", async () => {
    try {
      const snapshots = await Snapshot.find()
        .sort({ date: 1 })
        .limit(30); // Get last 30 days of data
      socket.emit("historicalData", snapshots);
    } catch (error) {
      console.error("Error fetching historical data:", error);
      socket.emit("error", "Failed to get historical data");
    }
  });

  socket.on("vote", async (winnerId, loserId) => {
    try {
      console.log(`Processing vote: Winner ID: ${winnerId}, Loser ID: ${loserId}`);
      
      const winner = await Pasta.findById(winnerId);
      const loser = await Pasta.findById(loserId);
      
      if (!winner || !loser) {
        console.error("Could not find pasta entries for vote");
        return;
      }
      
      console.log(`Updating stats: ${winner.name} (winner) vs ${loser.name} (loser)`);
      
      await Pasta.updateOne({ _id: winnerId }, { $inc: { wins: 1, plays: 1 } });
      await Pasta.updateOne({ _id: loserId }, { $inc: { plays: 1 } });

      // Get total votes
      const totalVotes = await Pasta.aggregate([
        { $group: { _id: null, total: { $sum: "$plays" } } }
      ]);

      // Fetch the updated top 10 pastas sorted by win rate
      const leaderboard = await Pasta.aggregate([
        { $addFields: { winRate: { $cond: [{ $eq: ["$plays", 0] }, 0, { $divide: ["$wins", "$plays"] }] } } },
        { $sort: { winRate: -1 } },
        { $limit: 10 }
      ]);

      console.log("Updated leaderboard:", leaderboard.map(p => `${p.name}: ${p.wins}/${p.plays}`));
      
      io.emit("updateLeaderboard", leaderboard);
      io.emit("updateTotalVotes", totalVotes[0]?.total || 0);
      sendNewPastaPair();
    } catch (error) {
      console.error("Error processing vote:", error);
      socket.emit("error", "Failed to process vote");
    }
  });

  // Send initial total votes with timeout
  try {
    const totalVotes = await Promise.race([
      Pasta.aggregate([
        { $group: { _id: null, total: { $sum: "$plays" } } }
      ]).exec(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out')), 5000)
      )
    ]);
    socket.emit("updateTotalVotes", totalVotes[0]?.total || 0);
  } catch (error) {
    console.error("Error getting total votes:", error);
    socket.emit("updateTotalVotes", 0);
  }

  sendNewPastaPair();
});

// Function to clean up duplicate pasta entries
async function cleanupDuplicatePastas() {
  try {
    // Get all pastas
    const pastas = await Pasta.find();
    
    // Group pastas by name
    const pastasByName = {};
    pastas.forEach(pasta => {
      if (!pastasByName[pasta.name]) {
        pastasByName[pasta.name] = [];
      }
      pastasByName[pasta.name].push(pasta);
    });
    
    // For each name with multiple entries, keep the one with the most plays
    for (const [name, namePastas] of Object.entries(pastasByName)) {
      if (namePastas.length > 1) {
        // Sort by plays (highest first)
        namePastas.sort((a, b) => b.plays - a.plays);
        
        // Keep the one with the most plays, delete the rest
        const [keepPasta, ...deletePastas] = namePastas;
        await Pasta.deleteMany({
          _id: { $in: deletePastas.map(p => p._id) }
        });
        
        console.log(`Cleaned up ${deletePastas.length} duplicate entries for ${name}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up duplicate pastas:', error);
  }
}

// Add route to trigger cleanup
app.get('/api/cleanup-pastas', async (req, res) => {
  try {
    await cleanupDuplicatePastas();
    res.json({ message: 'Cleanup completed successfully' });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to clean up pastas' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
