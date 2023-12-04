// server.js

const express = require('express');
const app = express();
app.get('*', (reg, res) => {
    res.redirect("https://github.com");
  });

console.log(`GateKeeper started`);