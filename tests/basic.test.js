// tests/basic.test.js

const { exec } = require('child_process');
const path = require('path');
const request = require('supertest');

// Access parameters in the config.ini file
require('dotenv').config({ path: path.resolve(__dirname, '../config.ini') });
const serverPort = process.env.SERVER_PORT;

describe('Server Test', () => {
    let serverProcess;

    // Start the server before running tests
    beforeAll((done) => {
    serverProcess = exec(`node server.js --port=${serverPort}`, (error, stdout, stderr) => {
        // Log the output of the child process
        console.log('Child Process Output:', stdout);
        console.error('Child Process Error:', stderr);

        // If there was an error, log it and proceed
        if (error) {
        console.error('Child Process Error:', error);
        }

        done(); // Continue with the test suite
    });

    setTimeout(() => done(), 3000); // Wait 3 seconds for the server to start
    });

    // Testing server functionality
    test('Server responds to GET request', async () => {
        const response = await request(`http://localhost:${serverPort}`).get('/');

        // Expect a status code of either 302 or 200
        expect(response.status).toBeOneOf([302, 200]);
    });

    // Stop the server after running tests
    afterAll(() => {
        serverProcess.kill('SIGTERM');
    });
});
