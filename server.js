require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB Connection with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
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
  name: String,
  wins: { type: Number, default: 0 },
  plays: { type: Number, default: 0 }
});

const Pasta = mongoose.model('Pasta', pastaSchema);

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
        "CANNELLONI",
        "ZITI",
        "MACARONI",
        "DITALINI",
        "RAVIOLI",
        "TORTELLINI",
        "AGNOLOTTI",
        "MANICOTTI",
        "ORZO",
        "LASAGNE",
        "PACCHERI",
        "CASARECCE",
        "PICCI",
        "TAGLIATELLE",
        "MAFALDE",
        "CONCHIGLIONI"
      ];

      await Pasta.insertMany(pastaNames.map(name => ({ name, wins: 0, plays: 0 })));
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

// Handle Voting Logic
io.on("connection", async (socket) => {
  console.log("A user connected");

  async function sendNewPastaPair() {
    try {
      const pastas = await Pasta.aggregate([{ $sample: { size: 2 } }]); // Get 2 random pastas
      socket.emit("newPair", pastas);
    } catch (error) {
      console.error("Error fetching pasta pair:", error);
      socket.emit("error", "Failed to get pasta options");
    }
  }

  socket.on("vote", async (winnerId, loserId) => {
    try {
      await Pasta.updateOne({ _id: winnerId }, { $inc: { wins: 1, plays: 1 } });
      await Pasta.updateOne({ _id: loserId }, { $inc: { plays: 1 } });

      // Fetch the updated top 10 pastas sorted by win rate
      const leaderboard = await Pasta.aggregate([
        { $addFields: { winRate: { $cond: [{ $eq: ["$plays", 0] }, 0, { $divide: ["$wins", "$plays"] }] } } },
        { $sort: { winRate: -1 } },
        { $limit: 10 }
      ]);

      io.emit("updateLeaderboard", leaderboard);
      sendNewPastaPair();
    } catch (error) {
      console.error("Error processing vote:", error);
      socket.emit("error", "Failed to process vote");
    }
  });

  sendNewPastaPair();
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
