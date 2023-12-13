// util.js

// Access parameters in the config.ini file
require('dotenv').config({ path: 'config.ini' });
const tokensEnabled = (process.env.TOKENS_ENABLED === "true");
const tokensPath = process.env.TOKENS_PATH;

let tokenlist;
function getTokenList() {
	if (tokensEnabled) {
		const fs = require('fs');
		const fileContent = fs.readFileSync(tokensPath, 'utf-8');
		const receivedList = fileContent.split('\n').map(line => line.trim()).filter(line => line !== '');
		tokenList = receivedList;
	} else { tokenList = ""; }
}
getTokenList();


function getHeaderData(header) {
	if (header.startsWith('Basic ')) {
		const base64Credentials = header.slice('Basic '.length); // Extract the base64-encoded credentials (excluding the 'Basic ' prefix)
		const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8'); // Decode the base64 string to a UTF-8 string
		[user, pass] = credentials.split(':'); // Split the username and password using the colon as a delimiter
		return [user, pass];
	}
	throw new Error(`Authentication Failed`);
}
async function authCheck(user, pass) {
	const bcrypt = require('bcrypt'); // Make use of BCRYPT for password hashing & checking
	if (user === "token") {  return !!tokenList.includes(pass); } // Single token authentication
	else { return !!userData.find(async (u) => u.username === user && u.password === pass); } // Username & password authentication
	//else { return !!userData.find(async (u) => u.username === user && await bcrypt.compare(u.password, pass)); } // Username & password authentication
}
function authCheckAdmin(user) { return !!userListAdmin.includes(user); }

module.exports = {
	getTokenList,	
	getHeaderData,
	authCheck,
	authCheckAdmin,
};