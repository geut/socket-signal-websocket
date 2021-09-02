import WebSocket from 'ws'
import { defaultUrlProvider, SocketSignalWebsocketClient } from './client.js'

SocketSignalWebsocketClient.WebSocket = WebSocket

export { defaultUrlProvider, SocketSignalWebsocketClient }
