// tests/maintable.test.js

const { spawn } = require('child_process'); // Required to spawn a test instance of the server
const request = require('supertest'); // Used to send http requests to the spawned instance
const path = require('path'); // Allow accessing files relative to the current directory

// Access parameters in the config.ini file
require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') });
const serverPort = process.env.SERVER_PORT;

let serverProcess;

async function startServer() {
	const serverPath = path.resolve(__dirname, '../server.js');

	// Spawn the process
	serverProcess = spawn('node', [serverPath]);

	// Use a promise to wait for the server to start
	await new Promise((resolve) => {
		serverProcess.stdout.on('data', (data) => {
			console.log(`Process Output: ${data}`);
			if (data.includes('Now listening on port')) { setTimeout(resolve, 100); } // Wait 1s to ensure proper startup
		});
	});

	serverProcess.stderr.on('data', (data) => { console.error(`Process Error: ${data}`); });
}

async function stopServer() {
	serverProcess.kill('SIGTERM');
	await new Promise((resolve) => {
		serverProcess.on('exit', () => { resolve(); });
	});
}

describe('Server Test - GET', () => {
    beforeAll(startServer);

    test('Test 1: Check response', async () => {
        const response = await request(`http://127.0.0.1:${serverPort}`).get(`/`);
        expect([302, 200]).toContain(response.status);
    });
    
    test('Test 2: Try invalid url', async () => {
        const response = await request(`http://127.0.0.1:${serverPort}`).get(`/nothing_here.file`);
        expect([302]).toContain(response.status);
    });

    afterAll(stopServer);
});

describe('Server Test - POST', () => {
    beforeAll(startServer);
	
	const makePostRequest = async (endpoint, payload) => {
		return await request(`http://127.0.0.1:${serverPort}`).post(endpoint).send(payload);
	};
    const executeTest = async (description, endpoint, payload, expectation) => {
        test(description, async () => {
            const response = await makePostRequest(endpoint, payload);
			if (expectation) { expect(response.body.success).toBeTruthy(); }
			 else if (!expectation) { expect(response.body.success).toBeFalsy(); }
            console.log(`${description} response:`, response.body);
        });
    };

	const testCases = [
		{ description: "Test 1: List users", 	endpoint: "/cmd", 		expectation: true,	payload: { username: "test_admin", password: "test_pass", content: "users" } },
		{ description: "Test 2: Create user", 	endpoint: "/create", 	expectation: true,	payload: { username: "test_admin", password: "test_pass", content: { username: "test_user", password: "test_pw" } } },
		{ description: "Test 3: Create admin", 	endpoint: "/create", 	expectation: true,	payload: { username: "test_admin", password: "test_pass", content: { username: "temp_admin", password: "test_pw", admin: true } } },
		{ description: "Test 4: Read user", 	endpoint: "/read", 		expectation: true,	payload: { username: "test_admin", password: "test_pass", content: { username: "test_user" } } },
		{ description: "Test 5: Update user", 	endpoint: "/update", 	expectation: true,	payload: { username: "test_admin", password: "test_pass", content: { username: "test_user", password: "new_password" } } },
		{ description: "Test 6: Delete user", 	endpoint: "/delete", 	expectation: true,	payload: { username: "test_admin", password: "test_pass", content: { username: "test_user" } } },
		{ description: "Test 7: Restore user", 	endpoint: "/restore",	expectation: true,	payload: { username: "test_admin", password: "test_pass", content: { username: "test_user" } } },
		{ description: "Test 8: Delete self", 	endpoint: "/delete", 	expectation: false,	payload: { username: "test_admin", password: "test_pass", content: { username: "test_admin" } } },
		{ description: "Test 9: Drop user", 	endpoint: "/drop", 		expectation: true,	payload: { username: "test_admin", password: "test_pass", content: { username: "test_user" } } },
		{ description: "Test 10: Drop admin", 	endpoint: "/drop", 		expectation: true,	payload: { username: "test_admin", password: "test_pass", content: { username: "temp_admin" } } },
	];

	testCases.forEach(({ description, endpoint, payload, expectation }) => {
			executeTest(description, endpoint, payload, expectation);
		});

    afterAll(stopServer);
});