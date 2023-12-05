// server.js

// Access parameters in the config.ini file
require('dotenv').config({ path: 'config.ini' });
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverURL = process.env.SERVER_URL;
const redirectURL = process.env.REDIRECT_URL;
const apiEndpoint = process.env.API_ENDPOINT;

// Use the timestamp methods inside the utility.js file
const console = require('./utility');

// Require the db.js file to access the sequelize functionality
const db = require('./db');

// Make use of the express.js framework for the core application
const express = require('express');
const app = express();

// Middleware to parse JSON in request body
app.use(express.json());

// Notify that the server has been started
console.log(`${serverName} started`);

// Bind the server to the specified port
const server = app.listen(serverPort, () => {
    console.log(`Now listening on port ${serverPort}`);
});

// Basic functionality to forward all requests to the specified redirect URL
app.get("*", (reg, res) => {
    res.redirect(serverURL);
    console.log(`Server has been accessed with these params: ${JSON.stringify(req.params)}`);
});

// Handle GET requests for the API endpoint
app.get(apiEndpoint, (reg, res) => {
    res.redirect(redirectURL);
    console.log(`API has been accessed with these params: ${JSON.stringify(req.params)}`);
});

// Handle POST requests for the API endpoint
app.post(apiEndpoint, async (req, res) => {
    const receivedData = req.body;
    try {
        // Implement logic to process the received data using sequelize functions
        const result = await db.updateData(receivedData.username, receivedData.password);

        // Respond with the result or any appropriate response
        res.json({ success: true, data: result });
    } catch (error) {
        // Handle errors
        console.error(`Error processing POST request: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
    console.log(`POST request handled with these params: ${JSON.stringify(req.params)}`);
});

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Graceful shutdown function, forces shutdown if exit process fails
function shutdown() {
    // Exit the process
    server.close(() => {
        console.log(`${serverName} stopped`);
        process.exit(0);
    });

    // Force shutdown if server hasn't stopped in time
    setTimeout(() => {
        console.error(`${serverName} terminated`);
        process.exit(22);
    }, 2000); // 2 seconds
}