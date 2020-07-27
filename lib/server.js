const Server = require('simple-websocket/server')
const { SocketSignalServerMap } = require('socket-signal')
const log = require('debug')('socket-signal:websocket-server')

class SocketSignalWebsocketServer extends SocketSignalServerMap {
  constructor (opts) {
    super(opts)

    this._server = new Server(opts)
    this._server.setMaxListeners(Infinity)
    this._server.on('connection', this._onSocket.bind(this))
    this.on('error', err => log(err))
    this.on('connection-error', err => log(err))
  }

  _onSocket (socket) {
    this.addSocket(socket).catch(err => process.nextTick(() => this.emit('error', err)))
  }

  async _close () {
    this._server.removeListener('connection', this._onSocket.bind(this))
    await super._close()
    return new Promise(resolve => this._server.close(() => resolve()))
  }
}

module.exports = SocketSignalWebsocketServer
