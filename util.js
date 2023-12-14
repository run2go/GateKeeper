// util.js

// Access parameters in the config.ini file
require('dotenv').config({ path: 'config.ini' });
const tokensEnabled = (process.env.TOKENS_ENABLED === "true");
const tokensPath = process.env.TOKENS_PATH;
const dbUsername = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;

const db = require('./db.js'); // Require the db.js file to access user & list data

let userData, userList, userListActive, userListDeleted, userListAdmin, tableList, tokenList;

async function initAdmin() { if (userListAdmin.length === 0) { await db.handleUser("create", dbUsername, dbPassword, true); } } // Add db admin user if adminlist is empty
async function updateAll() { await updateUserList(); await updateTableList(); updateTokenList(); } // Update all lists

async function updateUserList() {
	userData = await db.getUserData();
	userList = userData.map((u) => u.username);
	userListActive = userData.filter((u) => u.deleted === null).map((u) => u.username);
	userListDeleted = userData.filter((u) => u.deleted !== null).map((u) => u.username);
	userListAdmin = userData.filter((u) => u.admin === true).map((u) => u.username);
}
async function updateTableList() { tableList = await db.getTableData(); }
function updateTokenList() {
	if (tokensEnabled) {
		const fs = require('fs');
		const fileContent = fs.readFileSync(tokensPath, 'utf-8');
		const receivedList = fileContent.split('\n').map(line => line.trim()).filter(line => line !== '');
		tokenList = receivedList;
	} else { tokenList = ""; }
}

function getUserData() { return userData; }
function getUserList() { return userList; }
function getUserListActive() { return userListActive; }
function getUserListDeleted() { return userListDeleted; }
function getUserListAdmin() { return userListAdmin; }
function getTableList() { return tableList; }
function getTokenList() { return tokenList; }

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

function printLists() { return `Lists:\nUsers: ${userList}\nActive Users: ${userListActive}\nDeleted Users: ${userListDeleted}\nAdmins: ${userListAdmin}\nTables: ${tableList}`; }

module.exports = {
	updateUserList,
	updateTableList,
	updateTokenList,
	getUserData,
	getUserList,
	getUserListActive,
	getUserListDeleted,
	getUserListAdmin,
	getTableList,
	getTokenList,
	getHeaderData,
	authCheck,

	printLists,
	userData,
	userList,
	userListActive,
	userListDeleted,
	userListAdmin,
	tableList,
	
	updateAll,
	initAdmin,
};