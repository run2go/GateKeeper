// server.js

require('dotenv').config({ path: 'config.ini' }); // Access parameters in the config.ini file
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverURL = process.env.SERVER_URL;
const redirectURL = process.env.REDIRECT_URL;
const helpURL = process.env.HELP_URL;

const console = require('./log.js'); // Use the timestamp methods inside the util.js file

const express = require('express'); // Make use of the express.js framework for the core application
const app = express();
app.use(express.json()); // Middleware to parse JSON in request body

let server; // Declare server variable

async function serverStart() {
	try {
		console.log(`${serverName} started`); // Notify that the server has been started
		server = app.listen(serverPort, () => { console.log(`Now listening on port ${serverPort}`); }); // Bind the server to the specified port

		const db = require('./db.js'); // Require the db.js file to access the sequelize functionality
		let userData, userList, userListActive, userListDeleted, userListAdmin, tableList;
		async function updateUserList() {
			userData = await db.getUserData();
			userList = userData.map((u) => u.username);
			userListActive = userData.filter((u) => u.deleted === null).map((u) => u.username);
			userListDeleted = userData.filter((u) => u.deleted !== null).map((u) => u.username);
			userListAdmin = userData.filter((u) => u.admin === true).map((u) => u.username);
		}
		await updateUserList();

		async function updateTableList() { tableList = await db.getTableData(); }
		await updateTableList();
			
		if (userListAdmin.length === 0) { handleUser("create", dbUsername, dbPassword, true); } // Add db admin user if adminlist is empty
		
		console.debug(`userlist: ${userList}\nuserlistactive: ${userListActive}\nuserlistdeleted: ${userListDeleted}\nadminlist: ${userListAdmin}\ntablelist: ${tableList}`);

		let result;
		
		app.get("*", (req, res) => { // Forward GET requests to the specified redirectURL
			console.debug(`Request GET:\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
			res.redirect(redirectURL);
		});

		app.post("*", async (req, res) => { // Handle all POST requests
			console.debug(`Request POST:\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
			try {
				const [ user, pass ] = getHeaderData(req.headers['authorization']) // Get authorization header data
				const isAdmin = authCheckAdmin(user);
				
				const { username, password, admin, table, data } = req.body; // Deconstruct request body
				const path = req.path;
				
				if (!authCheck(user, pass)) { console.debug(`Response Code 401:\nUnauthorized`); res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
				else if (path.startsWith("/cmd") && isAdmin) { result = await urlCmd( data ); } // CMD Handling
				else if (path.startsWith("/query") && isAdmin) { result = await db.rawQuery( data ); } // Raw SQL Queries
				else if (path.startsWith("/user/") && isAdmin) { result = await db.handleUser(path.slice("/user/".length), username, password, admin); } // User Management
				else if (path.startsWith("/table/")) { result = await db.handleTable(path.slice("/table/".length), table, data); } // Table Management
				else if (path.startsWith("/data/")) { result = await db.handleData(path.slice("/data/".length), table, data); } // Table Data
				else { throw new Error(`Bad Request`); }
				
				console.debug(`Response Code 200:\n${result}`);
				res.json({ success: true, data: result });
			} catch (error) { console.debug(`Response Code 400:\n${error.message}`); res.status(400).json({ success: false, error: error.message }); }
		});

		function urlCmd(cmd) { // Handle API commands
			console.debug(cmd);
			switch (cmd) {
				case "help": result = helpURL; break;
				case "users": result = userList; break;
				case "admins": result = userListAdmin; break;
				case "tables": result = tableList; break;
				case "reload": userListUpdate(); tableListUpdate(); result = `${serverName} reloaded`; break;
				case "restart": result = `${serverName} restarted`; serverRestart(); break;
				case "stop": result = `${serverName} stopped`; setTimeout(() => { serverShutdown(); }, 10); break;
				default: throw new Error('Invalid command');
			}
			return result;
		}
		
		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', function (text) { // Allow console commands
			console.warn(`[CMD] ${text}`);
			switch(text.trim()) {
				case 'stop': serverShutdown(); break;
				case 'print': console.log(`userlist: ${userList}\nuserlistactive: ${userListActive}\nuserlistdeleted: ${userListDeleted}\nadminlist: ${userListAdmin}\ntablelist: ${tableList}`); break;
				case 'reload': userListUpdate(); tableUpdate(); console.log(`${serverName} reloaded`); break;
				case 'restart': serverRestart(); break;
				case 'help': console.log(helpURL); break;
				default: console.log(`Unknown command`);
			}
		});
	} catch (error) { console.error(`Runtime Error: ${error}`); } //error.message
}

process.on('SIGTERM', serverTerminate); // Handle shutdown signals
process.on('SIGQUIT', serverShutdown);
//process.on('SIGSTOP', serverShutdown);
process.on('SIGINT', serverShutdown);

function serverTerminate() {
	console.error(`${serverName} terminated`);
	process.exit(12);
}

function serverShutdown() { // Graceful shutdown function, forces shutdown if exit process fails
	console.log(`${serverName} stopped`);
    server.close(() => { process.exit(0); });
    setTimeout(() => { serverTerminate(); }, 2000); // Force shutdown if server hasn't stopped within 2s
}
function serverRestart() {
    server.close(() => { console.log(`${serverName} restarting`); }); // Exit the process
	serverStart();
}
serverStart(); // Start the async server function