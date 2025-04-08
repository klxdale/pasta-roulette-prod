# Pasta Roulette Web App Code

A web application that allows users to vote on their favorite pasta types and track rankings over time. The application features a real-time voting system and historical data visualization.

## Features

- Real-time voting system for different pasta types
- Historical data tracking and visualization
- Interactive chart showing pasta rankings over time
- Current leader display with high-resolution pasta images
- Mobile-responsive design

## Technologies Used

- Node.js
- Express.js
- Socket.IO for real-time updates
- MongoDB for data storage
- Chart.js for data visualization

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your MongoDB connection string:
   ```
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000
   ```
4. Start the server:
   ```bash
   node server.js
   ```

## Project Structure

- `public/` - Static files and client-side code
- `server.js` - Main server file
- `package.json` - Project dependencies and scripts

## License

MIT License 
