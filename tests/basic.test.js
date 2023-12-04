// tests/basic.test.js

const request = require('supertest');
const { exec } = require('child_process');
const config = require('dotenv').config({ path: 'config.ini' });
const serverPort = process.env.SERVER_PORT;

describe('Server Test', () => {
    let serverProcess;

    // Start the server before running tests
    beforeAll((done) => {
        serverProcess = exec(`node server.js --port=${serverPort}`);
        setTimeout(() => done(), 5000); // Wait for the server to start (adjust as needed)
    });

    // Testing server functionality
    test('Server responds to GET request', async () => {
        const response = await request(`http://localhost:${serverPort}`).get('/');

        // Expect a status code of 200 for a successful request
        expect(response.status).toBe(200);
    });

    // Stop the server after running tests
    afterAll(() => {
        serverProcess.kill('SIGTERM');
    });
});
