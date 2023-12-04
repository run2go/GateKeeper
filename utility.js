// utility.js

// Access parameters in the config.ini file
const config = require('dotenv').config({ path: 'config.ini' });
const loggingEnabled = process.env.LOGGING_ENABLED;
const logFilePath = process.env.LOGFILE_PATH;

// Use the file system library to write to the logfile
const fs = require('fs');

// Get the current date and format it into "year-month-day hour:minute:second"
const currentDate = new Date();
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Adding 1 to month since it's zero-based (January = 0, December = 11)
const day = String(currentDate.getDate()).padStart(2, '0');
const hour = String(currentDate.getHours()).padStart(2, '0');
const minute = String(currentDate.getMinutes()).padStart(2, '0');
const second = String(currentDate.getSeconds()).padStart(2, '0');
const formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

// Save the original console.log and console.error
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Adjust the default log() function, add a timestamp & enable logging
function log(...args) {
  const logMessage = `[${formattedDate}] ${args[0]}`;
  // Append the log message to the console
  if (args.length == 1) {
	originalConsoleLog(logMessage);
	if (loggingEnabled) fs.appendFileSync(logFilePath, logMessage + '\n');
  }
  else {
    originalConsoleLog(logMessage, args[1]);
    if (loggingEnabled) fs.appendFileSync(logFilePath, logMessage + args[1] +'\n');
  }
}

// Adjust the default error() function, add a timestamp & enable logging
function error(consoleOut) {
  const errorMessage = `[${formattedDate}] ${consoleOut}`;
  // Append the error message to the console
    if (args.length == 1) {
	originalConsoleError(errorMessage);
	if (loggingEnabled) fs.appendFileSync(logFilePath, errorMessage + '\n');
  }
  else {
    originalConsoleError(errorMessage, args[1]);
    if (loggingEnabled) fs.appendFileSync(logFilePath, errorMessage + args[1] +'\n');
  }
}

// Allow the use of "console.log()" and "console.error()"
module.exports = {
  log,
  error,
};