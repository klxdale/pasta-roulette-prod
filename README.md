# Pasta Roulette

A fun web application that lets users vote on their favorite pasta types in a head-to-head format. Built with Node.js, Express, Socket.IO, and MongoDB.

## Features

- Real-time voting system
- Head-to-head pasta comparisons
- Global leaderboard showing top 10 pasta types
- Sound effects for voting
- Responsive design
- MongoDB integration for persistent storage

## Setup

1. Clone the repository
```bash
git clone https://github.com/klxdale/pasta-roulette.git
cd pasta-roulette
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory and add your MongoDB connection string:
```
MONGODB_URI=your_mongodb_connection_string
PORT=3000
```

4. Start the server
```bash
node server.js
```

5. Open your browser and navigate to `http://localhost:3000`

## Technologies Used

- Node.js
- Express.js
- Socket.IO
- MongoDB
- HTML5/CSS3
- JavaScript

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/) 