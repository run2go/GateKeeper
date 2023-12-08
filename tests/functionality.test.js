// tests/functionality.test.js

const { spawn } = require('child_process');
const request = require('supertest');
const path = require('path');

// Access parameters in the config.ini file
require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') });
const serverPort = process.env.SERVER_PORT;
const apiEndpoint = process.env.API_ENDPOINT;

describe('Server Test - GET', () => {
    let serverProcess;

	// Start the server for GET test
	beforeAll(async () => {
		const serverPath = path.resolve(__dirname, '../server.js');

		// Spawn the process
		serverProcess = spawn('node', [serverPath]);

		// Use a promise to wait for the server to start
		await new Promise((resolve) => {
			serverProcess.stdout.on('data', (data) => {
				console.log(`Process Output: ${data}`);
				if (data.includes('Now listening on port')) {
					setTimeout(resolve, 500); // Wait 0.5s to ensure proper startup
				}
			});
		});

		serverProcess.stderr.on('data', (data) => {
			console.error(`Process Error: ${data}`);
		});
	});

    test('Test case 1: Check basic GET response', async () => {
        const response = await request(`http://127.0.0.1:${serverPort}`).get(`/`);

        // Using supertest's expect to assert the status directly
        expect([302, 200]).toContain(response.status);
    });
	
    test('Test case 2: Check API redirect functionality', async () => {
        const response = await request(`http://127.0.0.1:${serverPort}`).get(apiEndpoint);

        // Using supertest's expect to assert the status directly
        expect([302]).toContain(response.status);
    });

    afterAll(async () => {
        // Stop the server for GET testing
        serverProcess.kill('SIGTERM');
        await new Promise((resolve) => {
            serverProcess.on('exit', () => {
                console.log('Server process for GET testing exited.');
                resolve();
            });
        });
    });
});

describe('Server Test - POST', () => {
    let serverProcess;

    // Start the server for POST test
	beforeAll(async () => {
		const serverPath = path.resolve(__dirname, '../server.js');

		// Spawn the process
		serverProcess = spawn('node', [serverPath]);

		// Use a promise to wait for the server to start
		await new Promise((resolve) => {
			serverProcess.stdout.on('data', (data) => {
				console.log(`Process Output: ${data}`);
				if (data.includes('Now listening on port')) {
					setTimeout(resolve, 500); // Wait 0.5s to ensure proper startup
				}
			});
		});

		serverProcess.stderr.on('data', (data) => {
			console.error(`Process Error: ${data}`);
		});
	});

	// Helper function to make a POST request with a given payload
	const makePostRequest = async (payload) => {
		return await request(`http://127.0.0.1:${serverPort}`)
			.post(apiEndpoint)
			.send(payload);
	};
	
    test('Test case 1: List command', async () => {
        const listResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            cmd: 'list',
        });
        expect(listResponse.body.success).toBeTruthy();
		console.log('list command response:', listResponse.body);
	});
	
    test('Test case 2: Create user', async () => {
        const createUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            create: { username: 'test_user', password: 'test_pw' },
        });
        expect(createUserResponse.body.success).toBeTruthy();
		console.log('create user response:', createUserResponse.body);
	});

    test('Test case 3: Create admin user', async () => {
        const createAdminUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            create: { username: 'temp_admin', password: 'test_pw', admin: true },
        });
        expect(createAdminUserResponse.body.success).toBeTruthy();
		console.log('create admin response:', createAdminUserResponse.body);
	});

    test('Test case 4: Read user', async () => {
        const readUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            read: { username: 'test_user' },
        });
        expect(readUserResponse.body.success).toBeTruthy();
		console.log('read user response:', readUserResponse.body);
	});

    test('Test case 5: Update user password', async () => {
        const updateUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            update: { username: 'test_user', password: 'new_password' },
        });
        expect(updateUserResponse.body.success).toBeTruthy();
		console.log('update user response:', updateUserResponse.body);
	});

    test('Test case 6: Delete user', async () => {
        const deleteUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            delete: { username: 'test_user' },
        });
        expect(deleteUserResponse.body.success).toBeTruthy();
		console.log('delete user response:', deleteUserResponse.body);
	});

    test('Test case 7: Attempt to delete admin', async () => {
		const deleteAdminResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            delete: { username: 'temp_admin' },
        });
        expect(deleteAdminResponse.body.success).toBeTruthy();
		console.log('delete admin response:', deleteAdminResponse.body);
	});

    test('Test case 8: Drop a soft-deleted user', async () => {
		const dropUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            drop: { username: 'test_user' },
        });
        expect(dropUserResponse.body.success).toBeTruthy();
		console.log('drop deleted user response:', dropUserResponse.body);
	});
    

    test('Test case 9: Drop a admin user', async () => {
		const dropUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            drop: { username: 'temp_admin' },
        });
        expect(dropUserResponse.body.success).toBeTruthy();
		console.log('drop admin user response:', dropUserResponse.body);
	});

    afterAll(async () => {
        // Stop the server for POST testing
        serverProcess.kill('SIGTERM');
        await new Promise((resolve) => {
            serverProcess.on('exit', () => {
                console.log('Server process for POST testing exited.');
                resolve();
            });
        });
    });
});