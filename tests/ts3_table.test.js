// tests/ts3_table.test.js

const { spawn } = require('child_process'); // Required to spawn a test instance of the server
const request = require('supertest'); // Used to send http requests to the spawned instance
const path = require('path'); // Allow accessing files relative to the current directory

require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') }); // Access parameters in the config.ini file
const serverPort = process.env.SERVER_PORT;

let serverProcess;

async function startServer() {
	const serverPath = path.resolve(__dirname, '../server.js');

	serverProcess = spawn('node', [serverPath]); // Spawn the process
	await new Promise((resolve) => { // Use a promise to wait for the server to start
		serverProcess.stdout.on('data', (data) => {
			console.log(`Process Output: ${data}`);
			if (data.includes('Now listening on port')) { setTimeout(resolve, 500); } // Wait 0.5s to ensure proper startup
		});
	});

	serverProcess.stderr.on('data', (data) => { console.error(`Process Error: ${data}`); });
}

async function stopServer() {
	serverProcess.kill('SIGKILL');
	await new Promise((resolve) => {
		serverProcess.on('exit', () => { resolve(); });
	});
}

const makePostRequest = async (endpoint, payload, auth) => {
	const requestObject = request(`http://127.0.0.1:${serverPort}`).post(endpoint).send( payload );
	const base64Credentials = Buffer.from(`${auth.user}:${auth.pass}`).toString('base64');
    requestObject.set('Authorization', `Basic ${base64Credentials}`);
	return await requestObject;
};

const executeTest = async (description, endpoint, expectation, payload, auth) => {
	test(description, async () => {
		const response = await makePostRequest(endpoint, payload, auth);
		if (expectation) { expect(response.body.success).toBeTruthy(); }
		else if (!expectation) { expect(response.body.success).toBeFalsy(); }
		console.log(`${description} response:`, response.body);
	});
};

describe('Test Suite - POST - Table Management', () => {
    beforeAll(startServer);

	const testCases = [ //create read add set delete restore drop
		{ description: "Test 1: CREATE table", endpoint: "/create", expectation: true,
		payload: { table: "new_table", data: { title: "title text", description: "description text" } },
		auth: { user: "test_admin", pass: "test_pass" } },
		
		{ description: "Test 2: CREATE same table", endpoint: "/create", expectation: false,
		payload: { table: "new_table", data: { name: "John Doe" } },
		auth: { user: "test_admin", pass: "test_pass" } },
		
		{ description: "Test 3: READ full table", endpoint: "/read", expectation: true,
		payload: { table: "new_table" },
		auth: { user: "test_admin", pass: "test_pass" } },
		
		{ description: "Test 4: READ table specific", endpoint: "/read", expectation: true,
		payload: { table: "new_table", data: { title: "title" } },
		auth: { user: "test_admin", pass: "test_pass" } },
		
		{ description: "Test 5: ADD table entry", endpoint: "/add", expectation: true,
		payload: { table: "new_table", data: { title: "another title text", description: "description text" } },
		auth: { user: "test_admin", pass: "test_pass" } },
		
		{ description: "Test 6: UPDATE table", endpoint: "/update", expectation: true,
		payload: { table: "new_table", data: { title: "title text", description: "description text" } },
		auth: { user: "test_admin", pass: "test_pass" } },
		
		{ description: "Test 7: DELETE table row",  endpoint: "/delete", expectation: true,
		payload: { table: "new_table", data: { title: "title text" } },
		auth: { user: "test_admin", pass: "test_pass" } },
		
		{ description: "Test 8: DELETE full table", endpoint: "/delete", expectation: true,
		payload: { table: "new_table" },
		auth: { user: "test_admin", pass: "test_pass" } },
		
		{ description: "Test 9: RESTORE table", endpoint: "/restore", expectation: true,
		payload: { table: "deleted_new_table" },
		auth: { user: "test_admin", pass: "test_pass" } },
		
		{ description: "Test 10: DROP table", endpoint: "/drop", expectation: true,
		payload: { table: "new_table" },
		auth: { user: "test_admin", pass: "test_pass" } },
	];
	testCases.forEach((params) => { executeTest(...Object.values(params)); });

    afterAll(stopServer);
});