// tests/ts2_user.test.js

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
  const requestObject = request(`http://127.0.0.1:${serverPort}`).post(endpoint).send({ data: payload });

  if (auth) {
    const base64Credentials = Buffer.from(`${auth.user}:${auth.pass}`).toString('base64');
    requestObject.set('Authorization', `Basic ${base64Credentials}`);
  }

  return await requestObject;
};

const executeTest = async (description, endpoint, payload, expectation) => {
	test(description, async () => {
		const response = await makePostRequest(endpoint, payload);
		if (expectation === true) { expect(response.body.success).toBeTruthy(); }
		else if (expectation === false) { expect(response.body.success).toBeFalsy(); }
		console.log(`${description} response:`, response.body);
	});
};

describe('Test Suite - POST - User Management', () => {
    beforeAll(startServer);
	
	const testCases = [
		{ description: "Test 1: CREATE user", 	endpoint: "/user/create", 	expectation: true,	payload: { username: "test_user", password: "test_pw" }, auth: { user: "token", pass: "test_token" } },
		{ description: "Test 2: CREATE admin", 	endpoint: "/user/create", 	expectation: true,	payload: { username: "temp_admin", password: "test_pw" }, admin: true , auth: { user: "token", pass: "test_token" } },
		{ description: "Test 3: READ user", 	endpoint: "/user/read", 	expectation: true,	payload: { username: "test_user" }, auth: { user: "token", pass: "test_token" } },
		{ description: "Test 4: UPDATE user", 	endpoint: "/user/update", 	expectation: true,	payload: { username: "test_user", password: "new_password" }, auth: { user: "token", pass: "test_token" } },
		{ description: "Test 5: DELETE user", 	endpoint: "/user/delete", 	expectation: true,	payload: { username: "test_user" }, auth: { user: "token", pass: "test_token" } },
		{ description: "Test 6: RESTORE user", 	endpoint: "/user/restore",	expectation: true,	payload: { username: "test_user" }, auth: { user: "token", pass: "test_token" } },
		{ description: "Test 7: DELETE self", 	endpoint: "/user/delete", 	expectation: false,	payload: { username: "test_admin" }, auth: { user: "token", pass: "test_token" } },
		{ description: "Test 8: DROP user", 	endpoint: "/user/drop", 	expectation: true,	payload: { username: "test_user" }, auth: { user: "token", pass: "test_token" } },
		{ description: "Test 9: DROP admin", 	endpoint: "/user/drop", 	expectation: true,	payload: { username: "temp_admin" }, auth: { user: "token", pass: "test_token" } },
	];
	testCases.forEach((params) => { executeTest(...Object.values(params)); });

    afterAll(stopServer);
});
