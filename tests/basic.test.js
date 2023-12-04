// tests/basic.test.js

const { exec } = require('child_process');
const path = require('path');
const request = require('supertest');

// Access parameters in the config.ini file
require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') });
const serverPort = process.env.SERVER_PORT;

// Set a timeout for the entire test suite
jest.setTimeout(5000); // 5 seconds

describe('Server Test', () => {
    let serverProcess;

    // Start the server before running tests
    beforeAll(() => {
        // Using execSync instead of exec and remove await
        serverProcess = execSync(`node server.js --port=${serverPort}`);
        
        // Log the output of the child process
        console.log('Child Process Output:', serverProcess.toString());
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

    // Jest hook to handle open handles
    afterEach(() => {
        if (serverProcess && !serverProcess.killed) {
            serverProcess.kill('SIGTERM');
        }
    });
});
