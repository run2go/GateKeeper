// server.js

require('dotenv').config({ path: 'config.ini' }); // Access parameters in the config.ini file
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverURL = process.env.SERVER_URL;
const redirectURL = process.env.REDIRECT_URL;
const helpURL = process.env.HELP_URL;


const console = require('./log.js'); // Use the logging functionality inside the log.js file
const express = require('express'); // Make use of the express.js framework for the core application

const app = express();
app.use(express.json()); // Middleware to parse JSON in request body

let server; // Declare server variable

async function serverStart() {
	try {
		console.log(`${serverName} started`); // Notify that the server has been started
		server = app.listen(serverPort, () => { console.log(`Now listening on port ${serverPort}`); }); // Bind the server to the specified port
		
		const db = require('./db.js'); // Require the db.js file to access the sequelize functionality
		const util = require('./util.js'); // Use functions stored in the util.js file
		await util.updateAll(); // Get List data
		await util.initAdmin(); // Create admin account if missing
		console.debug(util.printLists());
		
		let result;
		
		app.get("*", (req, res) => { // Forward GET requests to the specified redirectURL
			console.debug(`Request GET:\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
			res.redirect(redirectURL);
		});

		app.post("*", async (req, res) => { // Handle all POST requests
			console.debug(`Request POST:\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
			try {
				const [ userHeader, passHeader ] = util.getHeaderData(req.headers['authorization']) // Get authorization header data
				const isAdmin = !!util.getUserListAdmin().includes(userHeader); // Create a bool if the current user is an admin
				const { user, pass, admin, table, data } = req.body; // Deconstruct request body
				const path = req.path;
				
				if (!util.authCheck(userHeader, passHeader)) { handleError(res, 401, false, 'Unauthorized'); }
				else if (path.startsWith("/cmd") && isAdmin) { result = await urlCmd( data ); } // CMD Handling
				else if (path.startsWith("/query") && isAdmin) { result = await db.rawQuery( data ); } // Raw SQL Queries
				else if (path.startsWith("/user/") && isAdmin) { result = await db.handleUser(path.slice("/user/".length), user, pass, admin); } // User Management
				else { result = await db.handleTable(path, table, data); } // Table & Data Management
				
				console.debug(`Response Code 200:\n${result}`);
				res.json({ success: true, data: result });
			} catch (error) { handleError(res, 400, false, error.message); }
		});

		function handleError(res, statusCode, success, errorText) {
			console.debug(`Response Code ${statusCode}:\n${errorText}`);
			res.status(statusCode).json({ success, error: errorText });
		}

		function urlCmd(command) { // Handle API commands
			switch (command) {
				case "help": result = helpURL; break;
				case "users": result = util.getUserList(); break;
				case "admins": result = util.getUserListAdmin(); break;
				case "tables": result = util.getTableList(); break;
				case "reload": util.updateAll(); result = `${serverName} reloaded`; break;
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
				case 'print': console.log(util.printLists()); break;
				case 'reload': util.updateUserList(); util.updateTableList(); console.log(`${serverName} reloaded`); break;
				case 'restart': serverRestart(); break;
				case 'help': console.log(helpURL); break;
				default: console.log(`Unknown command`);
			}
		});
	} catch (error) { console.error(`[ERROR] ${error}`); } //error.message
}

process.on('SIGTERM', serverTerminate); // Handle shutdown signals
process.on('SIGQUIT', serverShutdown);
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
