// server.js
const config = require('dotenv').config({ path: 'config.ini' });
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverURL = process.env.SERVER_URL;
const redirectURL = process.env.REDIRECT_URL;

const express = require('express');
const app = express();

app.get('*', (reg, res) => {
    res.redirect(redirectURL);
  });

console.log(`${serverName} started`);

// Handle shutdown signals
process.on('SIGTERM', Shutdown);
process.on('SIGINT', Shutdown);
  
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