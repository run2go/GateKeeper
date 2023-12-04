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

// Notify that the server has been started
console.log(`${serverName} started`);

// Bind the server to the specified port
app.listen(serverPort, () => {
    console.log(`Now listening on port ${serverPort}`);
});

// Basic functionality to forward all requests to the specified redirect URL
app.get('*', (reg, res) => {
    res.redirect(redirectURL);
    console.log(`Server has been accessed with: ${reg.params}`);
});

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Graceful shutdown function, forces shutdown if exit process fails
function shutdown() {
    console.log(`${serverName} stopped`);

    // Exit the process
    process.exit(0);

    // Force shutdown if server hasn't stopped in time
    setTimeout(() => {
        console.error(`${serverName} terminated`);
        process.exit(22);
    }, 2000); // 2 seconds
}