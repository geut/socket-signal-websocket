import Socket from 'simple-websocket'
import assert from 'nanocustomassert'
import WebSocket from 'isomorphic-ws'
import ReconnectingWebSocket from 'reconnecting-websocket'
import delay from 'delay'
import { SocketSignalClient } from 'socket-signal'
import debug from 'debug'

const log = debug('socket-signal:websocket-client')

// round robin url provider
export const defaultUrlProvider = urls => {
  let urlIndex = 0

  return () => {
    const url = urls[urlIndex++ % urls.length]
    log('url provider', url)
    return url
  }
}

export class SocketSignalWebsocketClient extends SocketSignalClient {
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

    const _onopen = ws.onopen
    const _onclose = ws.onclose
    const _onerror = ws.onerror

    ws.onopen = (ev) => {
      if (socket._chunk && !socket._cb) {
        socket._cb = () => {}
      }
      _onopen(ev)
    }

    ws.onclose = (ev) => {
      log('socket close', { shouldReconnect: ws._shouldReconnect, ev })
      socket.emit('disconnect', ws._shouldReconnect)
      if (ws._shouldReconnect) {
        socket.connected = false
      } else {
        _onclose(ev)
      }
    }

    ws.onerror = (ev) => {
      log('socket error', { shouldReconnect: ws._shouldReconnect, ev })
      socket.emit('disconnect', ws._shouldReconnect)
      if (ws._shouldReconnect) {
        socket.connected = false
      } else {
        _onerror(ev)
      }
    }

    return { ws, socket }
  }

  constructor (urlProvider, opts = {}) {
    const { heartbeat = false, simpleWebsocket, reconnectingWebsocket, onSocket = socket => socket, ...socketSignalOpts } = opts

    const { ws, socket } = SocketSignalWebsocketClient.createSocket(urlProvider, { simpleWebsocket, reconnectingWebsocket })

    super(onSocket(socket), socketSignalOpts)

    this._ws = ws
    this._heartbeat = heartbeat
    this._lastPing = 0

    let reconnected = false
    socket.on('connect', () => {
      this.emit('connected', reconnected).catch(err => {
        console.error(err)
      })
      reconnected = true
    })
    socket.on('disconnect', reconnect => {
      this.emit('disconnected', reconnect).catch(err => {
        console.error(err)
      })
    })
  }

  get connected () {
    return this._ws.readyState === this._ws.OPEN
  }

  get lastPing () {
    return this._lastPing
  }

  async _open () {
    this._heartbeat && this._startHeartbeat(this._heartbeat)
    return super._open()
  }

  async _startHeartbeat (opts = {}) {
    const { interval = 10 * 1000, timeout = 5 * 1000 } = typeof opts === 'boolean' ? {} : opts
    while (!(this.closed || this.closing)) {
      await delay(interval)
      if (this.connected && this.opened) {
        const data = await this.rpc
          .call('__ping__', { time: Date.now() }, { timeout })
          .catch(err => {
            this.emit('ping-error', err)
            if (this.closed || this.closing) return
            if (err.code === 'NMSG_ERR_TIMEOUT') return this._ws.reconnect()
          })
        if (data) {
          this.emit('ping', data.time)
          this._lastPing = data.time
        }
      }
    }
  }
}
