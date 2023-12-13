// tests/ts1_basic.test.js

const { spawn } = require('child_process'); // Required to spawn a test instance of the server
const request = require('supertest'); // Used to send http requests to the spawned instance
const path = require('path'); // Allow accessing files relative to the current directory

require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') }); // Access parameters in the config.ini file
const serverPort = process.env.SERVER_PORT;
const dbMaintable = process.env.DB_MAINTABLE;

let serverProcess;

async function startServer() {
	const serverPath = path.resolve(__dirname, '../server.js');

	serverProcess = spawn('node', [serverPath]); // Spawn the process
	await new Promise((resolve) => { // Use a promise to wait for the server to start
		serverProcess.stdout.on('data', (data) => {
			console.log(`Process Output: ${data}`);
			if (data.includes(`Now listening on port ${serverPort}`)) { setTimeout(resolve, 500); } // Wait 0.5s to ensure proper startup
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

describe('Test Suite A - GET - Routing Checks', () => {
    beforeAll(startServer);

    test('Test 1: Check response', async () => {
        const response = await request(`http://127.0.0.1:${serverPort}`).get(`/`);
        expect([302, 200]).toContain(response.status);
    });
    test('Test 2: Try invalid url', async () => {
        const response = await request(`http://127.0.0.1:${serverPort}`).get(`/nothing_here`);
        expect([302]).toContain(response.status);
    });

    afterAll(stopServer);
});

describe('Test Suite B - POST - Command Checks', () => {
    beforeAll(startServer);
	
	const testCases = [
		{ description: "Test 1: CMD Token Access", endpoint: "/cmd", expectation: false, payload: "help", auth: { user: "token", pass: "test_token" } },  
		{ description: "Test 2: CMD User Access", endpoint: "/cmd", expectation: true, payload: "tables", auth: { user: "test_admin", pass: "test_pass" } },
		{ description: "Test 2: CMD Admin Access", endpoint: "/cmd", expectation: true, payload: "admins", auth: { user: "test_user", pass: "test_pass" } },
		{ description: "Test 3: QUERY Raw SQL", endpoint: "/query", expectation: true, payload: `SELECT * FROM ${dbMaintable}`, auth: { user: "token", pass: "test_token" } },
	];
	testCases.forEach((params) => { executeTest(...Object.values(params)); });
	
    afterAll(stopServer);
});
