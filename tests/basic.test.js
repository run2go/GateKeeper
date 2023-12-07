// tests/basic.test.js

const { spawn } = require('child_process');
const request = require('supertest');
const path = require('path');
const waitOn = require('wait-on'); 

// Access parameters in the config.ini file
require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') });
const serverPort = process.env.SERVER_PORT;
const apiEndpoint = process.env.API_ENDPOINT;

// Timeout for the entire test suite
const timeoutTime = 60000; // 60 seconds
jest.setTimeout(timeoutTime);

describe('Server Test', () => {
    let serverProcess;

    // Start the server before running tests
    beforeAll(async () => {
        // Path to the server.js file
        const serverPath = path.resolve(__dirname, '../server.js');

        // Use wait-on to wait for the server to be ready
        await waitOn({
            resources: [`http://localhost:${serverPort}`],
            log: true,
            timeout: timeoutTime,
        });

        // Spawn the process
        serverProcess = spawn('node', [serverPath]);

        serverProcess.stdout.on('data', (data) => {
            console.log(`Process Output: ${data}`);
            // Check if the server has started successfully
            if (data.includes('Now listening on port')) {
                done();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`Process Error: ${data}`);
        });
    });

    // Testing server GET functionality
    test('Server responds to GET request', async () => {
        const response = await request(`http://localhost:${serverPort}`).get(apiEndpoint);

        // Using supertest's expect to assert the status directly
        expect([302, 200]).toContain(response.status);
    });

	// Testing server POST functionality
    test('Server responds to various POST requests', async () => {
        // Helper function to make a POST request with a given payload
        const makePostRequest = async (payload) => {
            return await request(`http://localhost:${serverPort}`)
                .post(apiEndpoint)
                .send(payload);
        };

        // Test case 1: List command
        const listResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            cmd: 'list',
        });
        expect(listResponse.body.success).toBe(true);

        // Test case 2: Create user
        const createUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            create: { username: 'test_user', password: 'test_pw' },
        });
        expect(createUserResponse.body.success).toBe(true);

        // Test case 3: Create admin user
        const createAdminUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            create: { username: 'temp_admin', password: 'test_pw', admin: true },
        });
        expect(createAdminUserResponse.body.success).toBe(true);

        // Test case 4: Read user
        const readUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            read: { username: 'test_user' },
        });
        expect(readUserResponse.body.success).toBe(true);

        // Test case 5: Update user password
        const updateUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            update: { username: 'test_user', password: 'new_password' },
        });
        expect(updateUserResponse.body.success).toBe(true);

        // Test case 6: Delete user
        const deleteUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            delete: { username: 'test_user' },
        });
        expect(deleteUserResponse.body.success).toBe(true);

        // Test case 7: Attempt to delete admin
        const deleteNonExistentUserResponse = await makePostRequest({
            username: 'test_admin',
            password: 'test_pass',
            delete: { username: 'temp_admin' },
        });
        expect(deleteNonExistentUserResponse.body.success).toBe(false);
	});

    // Stop the server after running tests
    afterAll(async () => {
        // Check if the serverProcess is defined before attempting to kill
        if (serverProcess) {
            // Sending the 'SIGTERM' signal to gracefully terminate the server
            serverProcess.kill('SIGTERM');
            serverProcess.on('exit', () => {
                done();
            });
        }
    });
});