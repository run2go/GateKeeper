// tests/basic.test.js

const { spawn } = require('child_process');
const request = require('supertest');
const path = require('path');

// Access parameters in the config.ini file
require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') });
const serverPort = process.env.SERVER_PORT;

// Timeout for the entire test suite
jest.setTimeout(5000); // 5 seconds

describe('Server Test', () => {
    let serverProcess;

    // Start the server before running tests
    beforeAll((done) => {
        // Path to the server.js file
        const serverPath = path.resolve(__dirname, '../server.js');

        // Spawn the process
        serverProcess = spawn('node', [serverPath]);

        serverProcess.stdout.on('data', (data) => {
            console.log(`Child Process Output: ${data}`);
            // Check if the server has started successfully
            if (data.includes('Now listening on port')) {
                done();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`Child Process Error: ${data}`);
        });
    });

    // Testing server functionality
    test('Server responds to GET request', async () => {
        const response = await request(`http://localhost:${serverPort}`).get('/');

        // Use supertest's expect to assert the status directly
        expect([302, 200]).toContain(response.status);
    });

    // Stop the server after running tests
    afterAll((done) => {
        // Check if the serverProcess is defined before attempting to kill
        if (serverProcess) {
            // Use 'SIGTERM' signal to gracefully terminate the server
            serverProcess.kill('SIGTERM');
            serverProcess.on('exit', () => {
                done();
            });
        }
    });
});