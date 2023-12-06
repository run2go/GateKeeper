// utility.js

// Access parameters in the config.ini file
require('dotenv').config({ path: 'config.ini' });
const loggingEnabled = process.env.LOGGING_ENABLED;
const logFilePath = process.env.LOGFILE_PATH;

// Use the file system library to write to the logfile
const fs = require('fs');

// Get the current date and format it into "year-month-day hour:minute:second"
function getDate() {
	const currentDate = new Date();
	const year = currentDate.getFullYear();
	const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Adding 1 to month since it's zero-based (January = 0, December = 11)
	const day = String(currentDate.getDate()).padStart(2, '0');
	const hour = String(currentDate.getHours()).padStart(2, '0');
	const minute = String(currentDate.getMinutes()).padStart(2, '0');
	const second = String(currentDate.getSeconds()).padStart(2, '0');
	const formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
	return formattedDate;
}
// Save the original console.log and console.error
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Adjust the default log() function, add a timestamp & enable logging
function log(...args) {
	const formattedDate = getDate();
    const logMessage = `[${formattedDate}] ${args[0]} ${args.slice(1).join(' ')}`;

    // Append the log message to the console
    originalConsoleLog(logMessage);

    if (loggingEnabled == "true") {
        fs.appendFileSync(logFilePath, logMessage + '\n');
    }
}

// Adjust the default error() function, add a timestamp & enable logging
function error(...args) {
	const formattedDate = getDate();
    const errorMessage = `[${formattedDate}] ${args[0]} ${args.slice(1).join(' ')}`;

    // Append the error message to the console
    originalConsoleError(errorMessage);

    if (loggingEnabled == "true") {
        fs.appendFileSync(logFilePath, errorMessage + '\n');
    }
}


// Allow the use of "console.log()" and "console.error()"
module.exports = {
  log,
  error,
};