"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WSServer = void 0;
const ws_1 = require("ws");
class WSServer {
    wss;
    constructor(server) {
        this.wss = new ws_1.WebSocketServer({ server });
        this.wss.on('connection', (ws) => {
            console.log('New WebSocket connection');
            ws.on('message', (message) => {
                console.log('Received:', message.toString());
            });
            ws.on('close', () => {
                console.log('Connection closed');
            });
        });
    }
    broadcast(event, data) {
        const message = JSON.stringify({ event, data });
        this.wss.clients.forEach(client => {
            if (client.readyState === 1) {
                client.send(message);
            }
        });
    }
}
exports.WSServer = WSServer;
//# sourceMappingURL=server.js.map