// server.js

const serverName = "GateKeeper"
const redirectURL = "https://github.com";

const express = require('express');
const app = express();
app.get('*', (reg, res) => {
    res.redirect(redirectURL);
  });

console.log(`${serverName} started`);

// Handle shutdown signals
process.on('SIGTERM', () => {
    gracefulShutdown();
  });
process.on('SIGINT', () => {
    gracefulShutdown();
});
  
function gracefulShutdown() {
    console.log(`${serverName} stopped`);

    // Exit the process
    process.exit(0);

    // Force shutdown if server hasn't stopped in time
    setTimeout(() => {
        console.error(`${serverName} terminated`);
        process.exit(22);
    }, 5000); // 5 seconds
}