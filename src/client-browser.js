/* global MozWebSocket */

import { defaultUrlProvider, SocketSignalWebsocketClient } from './client.js'

let ws = null

if (typeof WebSocket !== 'undefined') {
  ws = WebSocket
} else if (typeof MozWebSocket !== 'undefined') {
  ws = MozWebSocket
} else if (typeof global !== 'undefined') {
  ws = global.WebSocket || global.MozWebSocket
} else if (typeof window !== 'undefined') {
  ws = window.WebSocket || window.MozWebSocket
} else if (typeof self !== 'undefined') {
  ws = self.WebSocket || self.MozWebSocket
}

SocketSignalWebsocketClient.WebSocket = ws

export { defaultUrlProvider, SocketSignalWebsocketClient }
