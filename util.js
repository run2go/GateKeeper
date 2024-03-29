// util.js

// Access parameters in the config.ini file
require('dotenv').config({ path: 'config.ini' });
const tokensEnabled = (process.env.TOKENS_ENABLED === "true");
const tokensPath = process.env.TOKENS_PATH;
const dbUsername = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;

const db = require('./db.js'); // Require the db.js file to access user & list data

let userData, userList, userListActive, userListDeleted, userListAdmin, tableList, tableListActive, tableListDeleted, tokenList;

async function initAdmin() { if (userListAdmin.length === 0) { await db.handleUser("create", dbUsername, dbPassword, true); } } // Add db admin user if adminlist is empty
async function updateAll() { await updateUserList(); await updateTableList(); updateTokenList(); } // Update all lists

// Get the latest userData from the DB & store it in locally cached lists
async function updateUserList() {
	userData = await db.getUserData();
	userList = userData.map((u) => u.username);
	userListActive = userData.filter((u) => u.deleted === null).map((u) => u.username);
	userListDeleted = userData.filter((u) => u.deleted !== null).map((u) => u.username);
	userListAdmin = userData.filter((u) => u.admin === true).map((u) => u.username);
}

// Get & update tableData
async function updateTableList() {
	tableList = await db.getTableData();
	tableListActive = tableList.filter(tableName => !tableName.startsWith('deleted_'));
	tableListDeleted = tableList.filter(tableName => tableName.startsWith('deleted_'));
}

// if enabled, place contents of tokens.txt inside tokenList
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
function getTableListActive() { return tableListActive; }
function getTableListDeleted() { return tableListDeleted; }
function getTokenList() { return tokenList; }

function getHeaderData(header) {
	if (header && header.startsWith('Basic ')) {
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
	else { return !!userData.find(async (u) => u.username === user && u.deletedAt === null && await bcrypt.compare(u.password, pass)); } // Username & password authentication
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
	getTableListActive,
	getTableListDeleted,
	
	getTokenList,
	getHeaderData,
	
	authCheck,
	printLists,
	updateAll,
	initAdmin,
};