// tests/basic.test.js

const { exec } = require('child_process');
const path = require('path');
const request = require('supertest');

// Access parameters in the config.ini file
require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') });
const serverPort = process.env.SERVER_PORT;

// Set a timeout of 10 seconds for the entire test suite
jest.setTimeout(10000);

describe('Server Test', () => {
    let serverProcess;

    // Start the server before running tests
    beforeAll(async (done) => {
        serverProcess = await exec(`node server.js --port=${serverPort}`, (error, stdout, stderr) => {
            // Log the output of the child process
            console.log('Child Process Output:', stdout);
            console.error('Child Process Error:', stderr);

            // If there was an error, log it and proceed
            if (error) {
                console.error('Child Process Error:', error);
            }

            done(); // Continue with the test suite
        });

        setTimeout(() => done(), 2000); // Wait 2 seconds for the server to start
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