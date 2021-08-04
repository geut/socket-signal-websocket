import Server from 'simple-websocket/server.js'
import { SocketSignalServerMap } from 'socket-signal'
import debug from 'debug'

const log = debug('socket-signal:websocket-server')

export class SocketSignalWebsocketServer extends SocketSignalServerMap {
  constructor (opts) {
    super(opts)

    const { simpleWebsocket } = opts

    if (simpleWebsocket) {
      this._server = new Server(simpleWebsocket)
      this._server.setMaxListeners(Infinity)
      this._server.on('connection', this.handleConnection.bind(this))
    }

    this.on('error', err => log(err))
    this.on('connection-error', err => log(err))
  }

  get ws () {
    return this._server._server
  }

  handleConnection (socket) {
    return this.addSocket(socket)
      .then(rpc => {
        rpc.action('__ping__', () => ({ time: Date.now() }))
        return rpc
      })
      .catch(err => {
        process.nextTick(() => this.emit('error', err))
      })
  }

  async _close () {
    this._server && this._server.removeListener('connection', this.handleConnection.bind(this))
    await super._close()
    return this._server && new Promise(resolve => this._server.close(() => resolve()))
  }
}
