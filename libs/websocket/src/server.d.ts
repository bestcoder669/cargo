import { Server } from 'http';
export declare class WSServer {
    private wss;
    constructor(server: Server);
    broadcast(event: string, data: any): void;
}
//# sourceMappingURL=server.d.ts.map