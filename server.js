// server.js

require('dotenv').config({ path: 'config.ini' }); // Access parameters in the config.ini file
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverURL = process.env.SERVER_URL;
const redirectURL = process.env.REDIRECT_URL;
const helpURL = process.env.HELP_URL;
const dbUsername = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;

const console = require('./utility'); // Use the timestamp methods inside the utility.js file

const express = require('express'); // Make use of the express.js framework for the core application
const app = express();
app.use(express.json()); // Middleware to parse JSON in request body

let server; // Declare server variable

async function startServer(){
	try {
		console.log(`${serverName} started`); // Notify that the server has been started
		server = app.listen(serverPort, () => { console.log(`Now listening on port ${serverPort}`); }); // Bind the server to the specified port

		const db = require('./db'); // Require the db.js file to access the sequelize functionality
		let userData = await db.getUserData();
		let	userList = userData.map((user) => user.username);
		let	userListActive = userData.filter((user) => user.deleted === null).map((user) => user.username);
		let	userListDeleted = userData.filter((user) => user.deleted !== null).map((user) => user.username);
		let	userlistAdmin = userData.filter((user) => user.admin === true).map((user) => user.username);
		async function listUpdate() { // Fetch the data of valid usernames from the database
			userData = await db.getUserData();
			userList = userData.map((user) => user.username);
			userListActive = userData.filter((user) => user.deleted === null).map((user) => user.username);
			userListDeleted = userData.filter((user) => user.deleted !== null).map((user) => user.username);
			userlistAdmin = userData.filter((user) => user.admin === true).map((user) => user.username);
		}
		let tableList = await db.getTableData(); // Fetch the list of available tables from the database
		if (userlistAdmin.length === 0) { await db.dataCreate(dbUsername, dbPassword, true); } // Add db admin user if adminlist is empty
		
		function authCheck(user, pass) { return userData.find((u) => (u.username === user && u.password === pass)) ? true : false; }
		function authCheckAdmin(user) { return userData.find((u) => (u.username === user && u.admin === true)) ? true : false; }
		
		console.log(`Fetched userlist: ${userListActive}`);
		console.log(`Fetched adminlist: ${userlistAdmin}`);
		console.log(`Fetched tablelist: ${tableList}`);

		let result;
		
		app.get("/", (req, res) => { // Basic functionality to forward requests on the root directory to the specified redirectURL
			res.redirect(redirectURL);
			console.log(`Server Access via GET on root dir: ${JSON.stringify(req.params)}`);
		});
		
		app.get("*", (req, res) => { // Receive all other requests and forward to the specified serverURL
			res.redirect(serverURL);
			console.log(`Server Accessed via GET: ${JSON.stringify(req.params)}`);
		});

		app.post("/cmd", async (req, res) => {
			try {
				if (!authCheck(req.body.username, req.body.password)) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
				switch (req.body.content) {
					case "help": result = helpURL; break;
					case "users":
					case "listusers":
					case "userlist": result = userList; break;
					case "listadmins":
					case "adminlist":
					case "admins": result = userlistAdmin; break;
					case "tablelist":
					case "listtables":
					case "tables": result = tableList; break;
					case "refresh":
					case "update":
						listUpdate();
						result = `${serverName} refreshed`;
						break;
					case "reload":
					case "restart":
					case "reboot":
						result = `${serverName} restarting`;
						restart();
						break;
					case "shutdown":
					case "exit":
					case "kill":
					case "stop":
						result = `${serverName} stopped`;
						setTimeout(() => { shutdown();}, 250);
						break;
					default: throw new Error('Invalid command');
				}
				res.json({ success: true, data: result });
			} catch (error) { res.status(400).json({ success: false, error: error.message }); }
		});
		
		app.post("/create", async (req, res) => {
			try {
				const { username, password, content, tablename } = req.body; // Deconstruct req.body contents
				if (!authCheck(username, password)) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
				else if (tablename && content) {
					if (tableList.includes(tablename)) { throw new Error(`Table '${tablename}' already exists`); }
					result = await db.tableCreate(
						tablename,
						content
					);
					tableList = await db.getTableData();
				} else if (content) {
					if (userList.includes(content.username)) { throw new Error(`Username '${content.username}' already exists`); }
					result = await db.dataCreate(
						content.username,
						content.password,
						(authCheckAdmin(username)) ? content.admin : false
					);
					listUpdate();
				}
				else { throw new Error(`Invalid format`); }
				res.json({ success: true, data: result });
			} catch (error) { res.status(400).json({ success: false, error: error.message }); }
		});

		app.post("/read", async (req, res) => {
			try {
				const { username, password, content, tablename } = req.body; // Deconstruct req.body contents
				if (!authCheck(username, password)) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
				else if (tablename) {
					result = await db.tableRead(tablename, content.id);
					}
				else if (content) {
					if (!userList.includes(content.username)) { throw new Error(`Username '${content.username}' not found`); }
					else if (userData.find((u) => (u.username === content))) { result = await db.dataRead(content); }
				}
				else { throw new Error(`Invalid format`); }
				res.json({ success: true, data: result });
			} catch (error) { res.status(400).json({ success: false, error: error.message }); }
		});

		app.post("/update", async (req, res) => {
			try {
				const { username, password, content, tablename } = req.body; // Deconstruct req.body contents
				if (!authCheck(username, password)) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
				if (tablename) {
					if (!tableList.includes(tablename)) { throw new Error(`Table '${tablename}' doesn't exist`); }
					result = await db.tableUpdate(
						tablename,
						content
					);
				} else if (content) {
					if (!userList.includes(content.username)) { throw new Error(`Username '${content.username}' doesn't exist`); }
					result = await db.dataUpdate(
						content.username,
						content.password,
						(authCheckAdmin(username)) ? content.admin : false
					);
					listUpdate();
				}
				res.json({ success: true, data: result });
			} catch (error) { res.status(400).json({ success: false, error: error.message }); }
		});

		app.post("/delete", async (req, res) => {
			try {
				const { username, password, content, tablename } = req.body; // Deconstruct req.body contents
				if (!authCheck(username, password)) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
				if (tablename) {
					if (!tableList.includes(tablename)) { throw new Error(`Table '${tablename}' doesn't exist`); }
					result = await db.tableDelete(tablename, content.id);
					tableList = await db.getTableData();
				} else {
					if (!userList.includes(content.username)) { throw new Error(`Username '${content.username}' doesn't exist`); }
					else if (username === content.username) { throw new Error(`Can't delete the active user`); }
					else if (userListDeleted.includes(content.username)) { throw new Error(`Username '${content.username}' already (soft)deleted`); }
					result = await db.dataDelete(content.username);
					listUpdate();
				}
				res.json({ success: true, data: result });
			} catch (error) { res.status(400).json({ success: false, error: error.message }); }
		});

		app.post("/restore", async (req, res) => {
			try {
				const { username, password, content, tablename } = req.body; // Deconstruct req.body contents
				if (!authCheck(username, password)) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
				if (tablename) {
					if (!tableList.includes(tablename)) { throw new Error(`Table '${tablename}' doesn't exist`); }
					let tablename = tablename.startsWith("deleted_") ? tablename : `deleted_${tablename}`;
					result = await db.tableRestore(tablename);
					tableList = await db.getTableData();
				} else {
					if (!userList.includes(content.username)) { throw new Error(`Username '${content.username}' doesn't exist`); }
					else if (!userListDeleted.includes(content.username)) { throw new Error(`Username '${content.username}' already restored`); }
					result = await db.dataRestore(username);
					listUpdate();
				}
				res.json({ success: true, data: result });
			} catch (error) { res.status(400).json({ success: false, error: error.message }); }
		});

		app.post("/drop", async (req, res) => {
			try {
				const { username, password, content, tablename } = req.body; // Deconstruct req.body contents
				if (!authCheck(username, password)) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
				if (tablename) {
					if (!tableList.includes(tablename)) { throw new Error(`Table '${tablename}' doesn't exist`); }
					result = await db.tableDrop(tablename);
					tableList = await db.getTableData();
				} else {
					if (!userList.includes(content.username)) { throw new Error(`Username '${content.username}' doesn't exist`); }
					result = await db.dataDrop(content.username);
					listUpdate();
				}
				res.json({ success: true, data: result });
			} catch (error) { res.status(400).json({ success: false, error: error.message }); }
		});
	}
	catch (error) { console.error(`Error processing POST request: ${error.message}`); }
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
function restart() {
    server.close(() => { // Exit the process
        console.log(`${serverName} restarting`);
    });
	startServer();
}
startServer(); // Start the async server function