// log.js

// Access parameters in the config.ini file
require('dotenv').config({ path: 'config.ini' });
const logFilePath = process.env.LOGFILE_PATH;
const loggingEnabled = (process.env.LOGGING_ENABLED === "true");
const debugEnabled = (process.env.DEBUG_ENABLED === "true");

// Use the file system library to write to the logfile
const fs = require('fs');

// Get the current date and format it into "year-month-day hour:minute:second"
function getTimestamp() {
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

// Save the original console functions
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

// Adjust the default log() function, add a timestamp & enable logging
function log(...args) {
	const formattedDate = getTimestamp();
    const logMessage = `[${formattedDate}] ${args[0]} ${args.slice(1).join(' ')}`;

    // Append the log message to the console
    originalConsoleLog(logMessage);

    if (loggingEnabled) { fs.appendFileSync(logFilePath, logMessage + '\n'); }
}

// Adjust the default warn() function, add a timestamp & enable logging
function warn(...args) {
	const formattedDate = getTimestamp();
    const warnMessage = `[${formattedDate}] ${args[0]} ${args.slice(1).join(' ')}`;

    // Append the warn message to the console
    originalConsoleWarn(warnMessage);

    if (loggingEnabled) { fs.appendFileSync(logFilePath, warnMessage + '\n'); }
}

// Adjust the default error() function, add a timestamp & enable logging
function error(...args) {
	const formattedDate = getTimestamp();
    const errorMessage = `[${formattedDate}] ${args[0]} ${args.slice(1).join(' ')}`;

    // Append the error message to the console
    originalConsoleError(errorMessage);

    if (loggingEnabled) { fs.appendFileSync(logFilePath, errorMessage + '\n'); }
}

// Adjust the default debug() function, add a timestamp & enable logging
function debug(...args) {
	const formattedDate = getTimestamp();
    const debugMessage = `[${formattedDate}] ${args[0]} ${args.slice(1).join(' ')}`;

    // Append the debug message to the console
	originalConsoleDebug(debugEnabled ? `[DEBUG] ${debugMessage}` : debugMessage);

    if (loggingEnabled) { fs.appendFileSync(logFilePath, debugMessage + '\n'); }
}

module.exports = {
	getTimestamp,

	log,
	warn,
	error,
	debug,
};