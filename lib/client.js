const Socket = require('simple-websocket')
const assert = require('nanocustomassert')
const WebSocket = require('isomorphic-ws')
const { SocketSignalClient } = require('socket-signal')
const log = require('debug')('socket-signal:websocket-client')

// round robin url provider
const defaultUrlProvider = urls => {
  let urlIndex = 0

  return () => {
    const url = urls[urlIndex++ % urls.length]
    log('url provider', url)
    return url
  }
}

let ReconnectingWebSocket = require('reconnecting-websocket')
if (ReconnectingWebSocket.default) {
  ReconnectingWebSocket = ReconnectingWebSocket.default
}

class SocketSignalWebsocketClient extends SocketSignalClient {
  static createSocket (urlProvider, opts = {}) {
    assert(Array.isArray(urlProvider) || typeof urlProvider === 'function', 'must be an array or a function')

    const { simpleWebsocket = {}, reconnectingWebsocket = {} } = opts

    if (Array.isArray(urlProvider)) {
      urlProvider = defaultUrlProvider(urlProvider)
    }

    if (!reconnectingWebsocket.WebSocket) {
      reconnectingWebsocket.WebSocket = WebSocket
    }

    const ws = new ReconnectingWebSocket(urlProvider, reconnectingWebsocket.protocols, reconnectingWebsocket)

    const socket = new Socket({ socket: ws, ...simpleWebsocket })

    const _onclose = ws.onclose
    const _onerror = ws.onerror
    ws.onclose = (ev) => {
      log('socket close', { shouldReconnect: ws._shouldReconnect, ev })
      if (ws._shouldReconnect) {
        this.connected = false
      } else {
        _onclose(ev)
      }
    }
    ws.onerror = (ev) => {
      log('socket error', { shouldReconnect: ws._shouldReconnect, ev })
      if (ws._shouldReconnect) {
        this.connected = false
      } else {
        _onerror(ev)
      }
    }
    return socket
  }

  constructor (urlProvider, opts = {}) {
    super(SocketSignalWebsocketClient.createSocket(urlProvider, opts), opts)

    this.socket.on('connect', () => this.emit('connected'))
  }

  get connected () {
    return this.socket.readyState === this.socket.OPEN
  }
}

module.exports = SocketSignalWebsocketClient
