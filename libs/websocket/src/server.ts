import { Server } from 'http';
import { WebSocketServer } from 'ws';

export class WSServer {
  private wss: WebSocketServer;
  
  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    
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
  
  broadcast(event: string, data: any) {
    const message = JSON.stringify({ event, data });
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }
}
