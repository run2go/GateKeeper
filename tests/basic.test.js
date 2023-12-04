// tests/basic.test.js

const { exec } = require('child_process');
const path = require('path');
const request = require('supertest');

// Access parameters in the config.ini file
require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') });
const serverPort = process.env.SERVER_PORT;

// Set a timeout for the entire test suite (adjust as needed)
jest.setTimeout(5000); // 5 seconds

describe('Server Test', () => {
    let serverProcess;

    // Start the server before running tests
    beforeAll(async () => {
        serverProcess = await exec(`node server.js --port=${serverPort}`);
        // Log the output of the child process
        console.log('Child Process Output:', serverProcess.stdout);
        console.error('Child Process Error:', serverProcess.stderr);

        // If there was an error, log it
        if (serverProcess.error) {
            console.error('Child Process Error:', serverProcess.error);
        }
    });

    // Testing server functionality
    test('Server responds to GET request', async () => {
        const response = await request(`http://localhost:${serverPort}`).get('/');

        // Expect a status code of either 302 or 200
        expect([302, 200]).toContain(response.status);
    });

    // Stop the server after running tests
    afterAll(() => {
        serverProcess.kill('SIGTERM');
    });
});
