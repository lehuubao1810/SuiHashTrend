import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { Logger } from '@nestjs/common';
  import { Server } from 'ws';
  import * as WebSocket from 'ws';
  
  @WebSocketGateway(+process.env.WS_PORT || 8081)
  export class WsGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
  {
    @WebSocketServer()
    server: Server;
  
    private readonly logger = new Logger(WsGateway.name);
  
    afterInit(server: Server) {
      this.logger.log(
        `WebSocket server initialized on port ${process.env.WS_PORT || 8081}`
      );
    }
  
    handleConnection(client: WebSocket) {
      this.logger.log(`Client connected. Total clients: ${this.server.clients.size}`);
    }
  
    handleDisconnect(client: WebSocket) {
      this.logger.log(
        `Client disconnected. Total clients: ${this.server.clients.size}`
      );
    }
  
    broadcast(obj: any) {
      const payload = JSON.stringify({
        type: 'new_cid',
        timestamp: new Date().toISOString(),
        ...obj,
      });
  
      let sentCount = 0;
      this.server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
          sentCount++;
        }
      });
  
      this.logger.log(`📡 Broadcasted to ${sentCount} clients`);
      return sentCount;
    }
  
    sendToClient(client: WebSocket, obj: any) {
      if (client.readyState === WebSocket.OPEN) {
        const payload = JSON.stringify(obj);
        client.send(payload);
      }
    }
  }