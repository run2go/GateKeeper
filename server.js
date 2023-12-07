// server.js

// Access parameters in the config.ini file
require('dotenv').config({ path: 'config.ini' });
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverURL = process.env.SERVER_URL;
const redirectURL = process.env.REDIRECT_URL;
const apiEndpoint = process.env.API_ENDPOINT;
const helpURL = process.env.HELP_URL;

// Use the timestamp methods inside the utility.js file
const console = require('./utility');

// Make use of the express.js framework for the core application
const express = require('express');
const app = express();

// Declare server variable
let server;

// Middleware to parse JSON in request body
app.use(express.json());

async function startServer(){
	// Notify that the server has been started
	console.log(`${serverName} started`);

	// Bind the server to the specified port
	server = app.listen(serverPort, () => {
		console.log(`Now listening on port ${serverPort}`);
	});

	// Require the db.js file to access the sequelize functionality
	const db = require('./db');
	
	// Fetch the latest list of valid usernames from the database
	let userList = await db.getUserList();
	console.log(`Fetched userlist: ${userList}`);

	// Basic functionality to forward requests on the root directory
	app.get("/", (req, res) => {
		res.redirect(redirectURL);
		console.log(`Server has been accessed with these parameters: ${JSON.stringify(req.params)}`);
	});

	// Handle GET requests for the API endpoint
	app.get(apiEndpoint, (req, res) => {
		res.redirect((apiEndpoint !== "*" && apiEndpoint !== "/") ? serverURL : redirectURL); // Prevent redirect looping
		console.log(`API has been accessed with these parameters: ${JSON.stringify(req.params)}`);
	});

	// Handle POST requests for the API endpoint
	app.post(apiEndpoint, async (req, res) => {
		const receivedData = req.body;

		try {
			// Check if the provided username is in the list of valid usernames
			if (!userList.includes(receivedData.username)) {
				throw new Error('Invalid username');
			}
			
			// Authenticate the given credentials if valid
			const authCheck = await db.auth(receivedData.username, receivedData.password);
			if (authCheck) {
				let result;
				switch (true) {
					// Command
					case Boolean(receivedData.cmd):
						switch (receivedData.cmd) {
								case "help": result = helpURL; break;
								case "list": result = userList; break;
								default: throw new Error('Invalid command');
						}
						break;
						
					// Create
					case Boolean(receivedData.create):
						result = await db.dataCreate(
							receivedData.create.username,
							receivedData.create.password
						);
						userList = await db.getUserList(); // Update the current userlist
						break;

					// Read
					case Boolean(receivedData.read):
						result = await db.dataRead(receivedData.read.username);
						break;

					// Update
					case Boolean(receivedData.update):
						result = await db.dataUpdate(
							receivedData.update.username,
							receivedData.update.password
						);
						break;

					// Delete
					case Boolean(receivedData.delete):
						result = await db.dataRemove(receivedData.delete.username);
						userList = await db.getUserList(); // Update the current userlist
						break;

					// Drop
					case Boolean(receivedData.drop):
						result = await db.dataDrop(receivedData.drop.username);
						userList = await db.getUserList(); // Update the current userlist
						break;

					default:
						throw new Error('Invalid request format');
				}
				// Respond with the result or any appropriate response
				res.json({ success: true, data: result });
			}
		} catch (error) {
			// Handle errors
			console.error(`Error processing POST request: ${error.message}`);
			res.status(500).json({ success: false, error: error.message });
		}

		console.log(`POST request handled with these params: ${JSON.stringify(receivedData)}`);
	});
}

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

// Start the async server function
startServer();