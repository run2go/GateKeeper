// tests/basic.test.js

const { spawnSync } = require('child_process');
const path = require('path');
const request = require('supertest');

// Access parameters in the config.ini file
require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') });
const serverPort = process.env.SERVER_PORT;

// Timeout for the entire test suite
jest.setTimeout(5000); // 5 seconds

describe('Server Test', () => {
    let serverProcess;

    // Start the server before running tests
    beforeAll(() => {
        const result = spawnSync('node', ['server.js', `--port=${serverPort}`]);

        if (result.error) {
            console.error('Error starting server:', result.error);
            throw result.error; // Throw the error to fail the test suite
        }

        serverProcess = result.pid;  // pid is used to represent the child process
        // Log the output of the child process
        console.log('Child Process Output:', result.stdout.toString());
    });

    // Testing server functionality
    test('Server responds to GET request', async () => {
        const response = await request(`http://localhost:${serverPort}`).get('/');

        // Expect a status code of either 302 or 200
        expect([302, 200]).toContain(response.status);
    });

    // Stop the server after running tests
    afterAll(async () => {
        // Check if the serverProcess is defined before attempting to kill
        if (serverProcess) {
            // Use process.kill to ensure the process is properly terminated
            process.kill(serverProcess);
        }
    });

    // Jest hook to handle open handles
    afterEach(async () => {
        if (serverProcess && !serverProcess.killed) {
            serverProcess.kill('SIGTERM');
        }
    });
});
