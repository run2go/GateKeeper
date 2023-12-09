// server.js

require('dotenv').config({ path: 'config.ini' }); // Access parameters in the config.ini file
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverURL = process.env.SERVER_URL;
const redirectURL = process.env.REDIRECT_URL;
const apiEndpoint = process.env.API_ENDPOINT;
const helpURL = process.env.HELP_URL;

const console = require('./utility'); // Use the timestamp methods inside the utility.js file

const express = require('express'); // Make use of the express.js framework for the core application
const app = express();
app.use(express.json()); // Middleware to parse JSON in request body


let server; // Declare server variable

async function startServer(){
	console.log(`${serverName} started`); // Notify that the server has been started
	server = app.listen(serverPort, () => { console.log(`Now listening on port ${serverPort}`); }); // Bind the server to the specified port

	const db = require('./db'); // Require the db.js file to access the sequelize functionality
	
	let userList = await db.getUserList(); // Fetch the list of valid usernames from the database
	console.log(`Fetched userlist: ${userList}`);

	let tableList = await db.getTableList(); // Fetch the list of available tables from the database
	console.log(`Fetched tablelist: ${tableList}`);

	app.get("/", (req, res) => { // Basic functionality to forward requests on the root directory
		res.redirect(redirectURL);
		console.log(`Server has been accessed with these parameters: ${JSON.stringify(req.params)}`);
	});

	app.get(apiEndpoint, (req, res) => { // Handle GET requests for the API endpoint
		res.redirect((apiEndpoint !== "*" && apiEndpoint !== "/") ? serverURL : redirectURL); // Prevent redirect looping
		console.log(`API has been accessed with these parameters: ${JSON.stringify(req.params)}`);
	});

	app.post(apiEndpoint, async (req, res) => { // Handle POST requests for the API endpoint
		const data = req.body;
		try {
			if (!userList.includes(data.username)) { throw new Error('Invalid username'); } // Check if the provided username is in the list of valid usernames
			
			const authCheck = await db.authCheck(data.username, data.password); // Authenticate the given credentials if valid
			if (authCheck) {
				const authCheckAdmin = await db.authCheckAdmin(data.username); // Check if the authenticated user is an admin
				let result;
				switch (true) {
					case Boolean(data.cmd) && authCheckAdmin: // Command
						switch (data.cmd) {
                            case "help": result = helpURL; break;
                            case "listusers": result = userList; break;
                            case "listtables": result = tableList; break;
                            default: throw new Error('Invalid command');
						}
						break;
						
				case Boolean(data.create): // Create
					if (data.create.tablename) {
						if (data.create.columns && Array.isArray(data.create.columns)) {
							result = await db.tableCreate(data.create.tablename, data.create.columns); // Create a new table with dynamic columns
							tableList = await db.getTableList();
						}
						else { throw new Error('Invalid column information'); } // Handle the case where columns are not provided
					}
					else if (authCheckAdmin) {
						result = await db.dataCreate(
							data.create.username,
							data.create.password
						);
						userList = await db.getUserList();
					}
					break;

                case Boolean(data.read): // Read
                    if (data.read.tablename) { result = await db.tableRead(data.read.tablename, data.read.row); }
					else if (authCheckAdmin) { result = await db.dataRead(data.read.username); }
                    break;

                case Boolean(data.update): // Update
                    if (data.update.tablename) { // Use the provided field as table name and use its JSON content as data to update the table
                        result = await db.tableUpdate(
                            data.update.tablename,
                            data.update.row,
                            data.update.newData
                        );
                    }
					else if (authCheckAdmin) {
                        result = await db.dataUpdate(
                            data.update.username,
                            data.update.password
                        );
                    }
                    break;

                case Boolean(data.update): // Update own password
                    result = await db.dataUpdate(
                        data.username,
                        data.update.password
                    );
                    break;

                case Boolean(data.delete): // Delete
                    if (data.delete.tablename) {
                        result = await db.tableDelete(data.delete.tablename, data.delete.row);
                        tableList = await db.getTableList();
                    } else if (authCheckAdmin) {
                        result = await db.dataDelete(data.delete.username);
                        userList = await db.getUserList();
                    }
                    break;
                
                case Boolean(data.restore): // Restore
                    if (data.restore.tablename) {
                        result = await db.tableRestore(data.restore.tablename);
                        tableList = await db.getTableList();
                    } else if (authCheckAdmin) {
                        result = await db.dataRestore(data.restore.username);
                        userList = await db.getUserList();
                    }
                    break;

                case Boolean(data.drop) && authCheckAdmin: // Drop
                    if (data.drop.tablename) {
                        result = await db.tableDrop(data.drop.tablename);
                        tableList = await db.getTableList();
                    } else {
                        result = await db.dataDrop(data.drop.username);
                        userList = await db.getUserList();
                    }
                    break;

					default: throw new Error('Invalid request format');
				}
				res.json({ success: true, data: result }); // Respond with the result or any appropriate response
			}
		}
		catch (error) {
			console.error(`Error processing POST request: ${error.message}`); // Handle errors
			res.status(500).json({ success: false, error: error.message });
		}
		console.log(`POST request handled with these params: ${JSON.stringify(data)}`);
	});
}

process.on('SIGTERM', shutdown); // Handle shutdown signals
process.on('SIGINT', shutdown);

function shutdown() { // Graceful shutdown function, forces shutdown if exit process fails
    server.close(() => { // Exit the process
        console.log(`${serverName} stopped`);
        process.exit(0);
    });

    setTimeout(() => { // Force shutdown if server hasn't stopped in time
        console.error(`${serverName} terminated`);
        process.exit(22);
    }, 2000); // 2 seconds
}

startServer(); // Start the async server function