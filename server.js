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

async function serverRun() {
	try {
		console.log(`${serverName} started`); // Notify that the server has been started
		server = app.listen(serverPort, () => { console.log(`Now listening on port ${serverPort}`); }); // Bind the server to the specified port
		
		const db = require('./db.js'); // Require the db.js file to access the sequelize functionality
		const util = require('./util.js'); // Use functions stored in the util.js file
		await util.updateAll(); // Get List data
		await util.initAdmin(); // Create admin account if missing
		console.debug(util.printLists());
		
		function handleRequest(req) {
			console.debug(`Request:\nHeader:\n${JSON.stringify(req.headers)}\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
		}
		
		function handleResponse(req, res, type, statusCode, success, response) {
			const ipHead = req.headers['x-forwarded-for'] || '';
			const ipConn = req.connection.remoteAddress || '';
			const authorization = req.headers['authorization'] || '';
			const userAgent = req.headers['user-agent'] || '';
			const contentType = req.headers['content-type'] || '';

			console.log(`[IP] "${ipHead} - ${ipConn}" [TYPE] "${type}"${authorization ? ` [AUTH] "${authorization}"` : ''}${userAgent ? ` [USER-AGENT] "${userAgent}"` : ''}${contentType ? ` [CONTENT-TYPE] "${contentType}"` : ''} [STATUS] "${statusCode}"`);
			console.debug(`Response Code ${statusCode}:\n${response}`);

			if (res && statusCode === 200) { res.status(200).json({ success, data: response }); }
			else if (res) { res.status(statusCode).json({ success, error: response }); }
		}
		
		let result;
		
		app.get("*", (req, res) => { // Forward GET requests to the specified redirectURL
			handleRequest(req);
			handleResponse(req, null, "GET", 200, true, result);
			res.redirect(redirectURL);
		});

		app.post("*", async (req, res) => { // Handle all POST requests
			handleRequest(req);
			try {
				const [ userHeader, passHeader ] = util.getHeaderData(req.headers['authorization']) // Get authorization header data
				const isAdmin = !!util.getUserListAdmin().includes(userHeader); // Create a bool if the current user is an admin
				const { user, pass, admin, table, data } = req.body; // Deconstruct request body
				const path = req.path;

				let statusCode = 200;
				let statusSuccess = true;
				let response;
				
				if (!util.authCheck(userHeader, passHeader)) { handleResponse(req, res, "POST", 401, false, 'Unauthorized'); return; } // Validate the provided credentials
				else if (path.startsWith("/cmd") && isAdmin) { response = await urlCmd( data ); } // CMD Handling
				else if (path.startsWith("/query") && isAdmin) { [statusCode, statusSuccess, response] = await db.rawQuery( data ); } // Raw SQL Queries
				else if (path.startsWith("/user/") && isAdmin) { [statusCode, statusSuccess, response] = await db.handleUser(path.slice("/user/".length), user, pass, admin, userHeader); } // User Management
				else if (path.length > 1) { result = await db.handleTable(path, table, data); } // Table & Data Management
				else { handleResponse(req, res, "POST", 404, false, 'Not Found'); return; } // Dismiss out-of-the-order requests
				
				handleResponse(req, res, "POST", statusCode, statusSuccess, result);
			} catch (error) { handleResponse(req, res, "POST", 400, false, error.message); }
		});

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
			switch(text.trim()) {
				case 'stop': serverShutdown(); break;
				case 'print': console.log(util.printLists()); break;
				case 'debug': console.log(`Debug Status: ${console.toggleDebug()}`); break;
				case 'reload': util.updateAll(); console.log(`${serverName} reloaded`); break;
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
	serverRun();
}
serverRun(); // Start the async server function
