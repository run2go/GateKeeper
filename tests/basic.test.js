// tests/basic.test.js

const { spawn } = require('child_process');
const request = require('supertest');
const path = require('path');

// Access parameters in the config.ini file
require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') });
const serverPort = process.env.SERVER_PORT;
const apiEndpoint = process.env.API_ENDPOINT;

// Timeout for the entire test suite
jest.setTimeout(15000); // 15 seconds

describe('Server Test', () => {
    let serverProcess;

    // Start the server before running tests
    beforeAll((done) => {
        // Path to the server.js file
        const serverPath = path.resolve(__dirname, '../server.js');

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
        const response = await request(`http://localhost:${serverPort}`).get('/');

        // Using supertest's expect to assert the status directly
        expect([302, 200]).toContain(response.status);
    });

    // Testing server POST functionality
    test('Server responds to POST request with invalid username', async () => {
        const postData = {
            username: 'test_user',
            password: 'test_pw',
        };

        const response = await request(`http://localhost:${serverPort}`)
            .post(apiEndpoint)
            .send(postData);

        // Using supertest's expect to assert the status directly
        expect(500).toContain(response.status);
        // Assert the response body
        expect('Invalid username').toContain(response.body);
    });

    // Stop the server after running tests
    afterAll((done) => {
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