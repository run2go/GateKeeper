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
	
	// Fetch the list of valid usernames from the database
	let userList = await db.getUserList();
	console.log(`Fetched userlist: ${userList}`);

	// Fetch the list of available tables from the database
	let tableList = await db.getTableList();
	console.log(`Fetched tablelist: ${tableList}`);

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
		const data = req.body;

		try {
			// Check if the provided username is in the list of valid usernames
			if (!userList.includes(data.username)) {
				throw new Error('Invalid username');
			}
			
			// Authenticate the given credentials if valid
			const authCheck = await db.authCheck(data.username, data.password);
			if (authCheck) {
				const authCheckAdmin = await db.authCheckAdmin(data.username);
				let result;
				switch (true) {
					// Command
					case Boolean(data.cmd) && authCheckAdmin:
						switch (data.cmd) {
                            case "help": result = helpURL; break;
                            case "listusers": result = userList; break;
                            case "listtables": result = tableList; break;
                            default: throw new Error('Invalid command');
						}
						break;
						
				// Create
				case Boolean(data.create):
					if (data.create.tablename) {
						if (data.create.columns && Array.isArray(data.create.columns)) {
							// Create a new table with dynamic columns
							result = await db.tableCreate(data.create.tablename, data.create.columns);
							tableList = await db.getTableList();
						} else {
							// Handle the case where columns are not provided
							throw new Error('Invalid column information');
						}
					} else if (authCheckAdmin) {
						result = await db.dataCreate(
							data.create.username,
							data.create.password
						);
						userList = await db.getUserList();
					}
					break;

                // Read
                case Boolean(data.read) && authCheckAdmin:
                    if (data.read.tablename) {
                        result = await db.tableRead(data.read.tablename, data.read.row);
                    } else {
                        result = await db.dataRead(data.read.username);
                    }
                    break;

                // Update
                case Boolean(data.update):
                    if (data.update.tablename) {
                        // Use the provided field as table name and use its JSON content as data to update the table
                        result = await db.tableUpdate(
                            data.update.tablename,
                            data.update.row,
                            data.update.newData
                        );
                    } else if (authCheckAdmin) {
                        result = await db.dataUpdate(
                            data.update.username,
                            data.update.password
                        );
                    }
                    break;

                // Update own password
                case Boolean(data.update):
                    result = await db.dataUpdate(
                        data.username,
                        data.update.password
                    );
                    break;

                // Delete
                case Boolean(data.delete):
                    if (data.delete.tablename) {
                        result = await db.tableDelete(data.delete.tablename, data.delete.row);
                        tableList = await db.getTableList();
                    } else if (authCheckAdmin) {
                        result = await db.dataDelete(data.delete.username);
                        userList = await db.getUserList();
                    }
                    break;
                // Restore
                case Boolean(data.restore) && authCheckAdmin:
                    if (data.restore.tablename) {
                        result = await db.tableRestore(data.restore.tablename);
                        tableList = await db.getTableList();
                    } else {
                        result = await db.dataRestore(data.restore.username);
                        userList = await db.getUserList();
                    }
                    break;

                // Drop
                case Boolean(data.drop) && authCheckAdmin:
                    if (data.drop.tablename) {
                        result = await db.tableDrop(data.drop.tablename);
                        tableList = await db.getTableList();
                    } else {
                        result = await db.dataDrop(data.drop.username);
                        userList = await db.getUserList();
                    }
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

		console.log(`POST request handled with these params: ${JSON.stringify(data)}`);
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