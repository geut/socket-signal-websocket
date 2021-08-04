import crypto from 'crypto'
import wrtc from 'wrtc'
import delay from 'delay'

import { jest } from '@jest/globals'
import { SocketSignalWebsocketClient, SocketSignalWebsocketServer } from '../src/index.js'

test('basic', async () => {
  const server = new SocketSignalWebsocketServer({ simpleWebsocket: { port: 5000 } })
  server.on('error', console.error)

  const topic = crypto.randomBytes(32)

  const connected = jest.fn()

  const client1 = new SocketSignalWebsocketClient(['ws://localhost:5000'], {
    simplePeer: { wrtc },
    metadata: { user: 'peer1' }
  })
  const client2 = new SocketSignalWebsocketClient(['ws://localhost:5000'], {
    simplePeer: { wrtc },
    metadata: { user: 'peer2' }
  })

  client1.on('connected', connected)
  client2.on('connected', connected)

  client2.onIncomingPeer((peer) => {
    peer.setMetadata({ password: '456' })
  })

  await client1.join(topic)
  await client2.join(topic)

  client1.connect(topic, client2.id, { metadata: { password: '123' } })

  const [{ peer: remotePeer2 }, { peer: remotePeer1 }] = await Promise.all([
    client1.once('peer-connected'),
    client2.once('peer-connected')
  ])

  expect(remotePeer2.remoteMetadata).toEqual({ user: 'peer2', password: '456' })
  expect(remotePeer1.remoteMetadata).toEqual({ user: 'peer1', password: '123' })
  expect(connected).toHaveBeenCalledTimes(2)

  await client1.close()
  await client2.close()
  return server.close()
})

test('heartbeat', async () => {
  const server = new SocketSignalWebsocketServer({ simpleWebsocket: { port: 5001 } })
  server.on('error', console.error)

  const topic = crypto.randomBytes(32)

  const ping = jest.fn()
  const pingError = jest.fn()

  const client1 = new SocketSignalWebsocketClient(['ws://localhost:5001'], {
    simplePeer: { wrtc },
    metadata: { user: 'peer1' },
    heartbeat: {
      interval: 150,
      timeout: 50
    }
  })

  client1.on('ping', ping)
  client1.on('ping-error', pingError)

  await client1.join(topic)
  await delay(300)
  expect(ping).toHaveBeenCalled()

  return server.close()
})
