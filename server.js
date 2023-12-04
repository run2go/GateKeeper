// server.js

// Access parameters in the config.ini file
const config = require('dotenv').config({ path: 'config.ini' });
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverURL = process.env.SERVER_URL;
const redirectURL = process.env.REDIRECT_URL;

// Use the timestamp methods inside the utility.js file
const console = require('./utility');

// Make use of the express.js framework for the core application
const express = require('express');
const app = express();

app.get('*', (reg, res) => {
    res.redirect(redirectURL);
});

console.log(`${serverName} started`);

// Handle shutdown signals
process.on('SIGTERM', Shutdown);
process.on('SIGINT', Shutdown);

// Graceful shutdown function, forces shutdown if exit process fails
function Shutdown() {
    console.log(`${serverName} stopped`);

    // Exit the process
    process.exit(0);

    // Force shutdown if server hasn't stopped in time
    setTimeout(() => {
        console.error(`${serverName} terminated`);
        process.exit(22);
    }, 2000); // 2 seconds
}