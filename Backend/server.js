const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 5000;

let globalMonitoringProcess = null;
let honeyPotProcess = null;

app.use(express.static(path.join(__dirname, '../rans-frontend/build'))); // Adjust the path as necessary

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    // Global Monitoring Handlers
    socket.on('run-script', () => {
        if (globalMonitoringProcess == null) {
            globalMonitoringProcess = spawn('python', [path.join(__dirname, './globalMonitoring.py')]);
            socket.emit('process-id', `${globalMonitoringProcess.pid}`);

            globalMonitoringProcess.stdout.on('data', (data) => {
                socket.emit('message', data.toString());
            });

            globalMonitoringProcess.stderr.on('data', (data) => {
                socket.emit('message', data.toString());
            });

            globalMonitoringProcess.on('close', (code) => {
                socket.emit('message', `Global Monitoring process stopped with code ${code}`);
                globalMonitoringProcess = null;
            });
        }
    });

    socket.on('stop-script', () => {
        if (globalMonitoringProcess != null) {
            globalMonitoringProcess.kill();
            socket.emit('message', 'Global Monitoring process stopped');
            globalMonitoringProcess = null;
        }
    });

    // Honey Pot Monitoring Handlers
    socket.on('run-honeypot', () => {
        if (honeyPotProcess == null) {
            honeyPotProcess = spawn('python', [path.join(__dirname, './honeyPotMonitoring.py')]);
            socket.emit('honeypot-process-id', `${honeyPotProcess.pid}`);

            honeyPotProcess.stdout.on('data', (data) => {
                socket.emit('honeypot-message', data.toString());
            });

            honeyPotProcess.stderr.on('data', (data) => {
                socket.emit('honeypot-message', data.toString());
            });

            honeyPotProcess.on('close', (code) => {
                socket.emit('honeypot-message', `Honey Pot process stopped with code ${code}`);
                honeyPotProcess = null;
            });
        }
    });

    socket.on('stop-honeypot', () => {
        if (honeyPotProcess != null) {
            honeyPotProcess.kill();
            socket.emit('honeypot-message', 'Honey Pot process stopped');
            honeyPotProcess = null;
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../rans-frontend/build', 'index.html'));
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
