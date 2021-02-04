const crypto = require('crypto')
const once = require('events.once')
const wrtc = require('wrtc')
const delay = require('delay')

const { SocketSignalWebsocketClient, SocketSignalWebsocketServer } = require('..')

test('basic', async () => {
  const server = new SocketSignalWebsocketServer({ port: 5000 })
  server.on('error', console.error)

  const topic = crypto.randomBytes(32)

  const connected = jest.fn()

  const peer1 = new SocketSignalWebsocketClient(['ws://localhost:5000'], {
    simplePeer: { wrtc },
    metadata: { user: 'peer1' }
  })
  const peer2 = new SocketSignalWebsocketClient(['ws://localhost:5000'], {
    simplePeer: { wrtc },
    metadata: { user: 'peer2' }
  })

  peer1.on('connected', connected)
  peer2.on('connected', connected)

  peer2.onIncomingPeer((peer) => {
    peer.localMetadata = { password: '456' }
  })

  await peer1.join(topic)
  await peer2.join(topic)

  peer1.connect(topic, peer2.id, { metadata: { password: '123' } })

  const [[remotePeer2], [remotePeer1]] = await Promise.all([
    once(peer1, 'peer-connected'),
    once(peer2, 'peer-connected')
  ])

  expect(remotePeer2.metadata).toEqual({ user: 'peer2', password: '456' })
  expect(remotePeer1.metadata).toEqual({ user: 'peer1', password: '123' })
  expect(connected).toHaveBeenCalledTimes(2)

  await peer1.close()
  await peer2.close()
  return server.close()
})

test('heartbeat', async () => {
  const server = new SocketSignalWebsocketServer({ port: 5001 })
  server.on('error', console.error)

  const topic = crypto.randomBytes(32)

  const ping = jest.fn()
  const pingError = jest.fn()

  const peer1 = new SocketSignalWebsocketClient(['ws://localhost:5001'], {
    simplePeer: { wrtc },
    metadata: { user: 'peer1' },
    heartbeat: {
      interval: 150,
      timeout: 50
    }
  })

  peer1.on('ping', ping)
  peer1.on('ping-error', pingError)

  await peer1.join(topic)
  await delay(300)
  expect(ping).toHaveBeenCalled()

  return server.close()
})
