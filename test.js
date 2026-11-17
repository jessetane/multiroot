var tape = require('tape')
var fs = require('fs')
var http = require('http')
var MultiRoot = require('./')

var server = new MultiRoot({ port: 7357 })

tape('single path', t => {
  t.plan(2)

  server.once('serve', path => {
    t.equal(path, __dirname)
    http.request({
      path: '/index.js',
      port: 7357,
    })
      .on('response', res => {
        var data = ''
        res.on('data', d => data += d)
        res.on('end', () => {
          t.equal(data, fs.readFileSync(__dirname + '/index.js', 'utf8'))
        })
      })
      .end()
  })

  server.apps.a = {
    root: __dirname
  }

  server.names.localhost = {
    appId: 'a'
  }

  server.reload()
})

tape('add path', t => {
  t.plan(2)

  server.once('serve', path => {
    t.equal(path, __dirname + '/node_modules/ecstatic')
    http.request({
      path: '/example/core.js',
      port: 7357,
      headers: {
        host: 'b'
      }
    })
      .on('response', res => {
        var data = ''
        res.on('data', d => data += d)
        res.on('end', () => {
          t.equal(data, fs.readFileSync(__dirname + '/node_modules/ecstatic/example/core.js', 'utf8'))
        })
      })
      .end()
  })

  server.apps.b = {
    root: __dirname + '/node_modules/ecstatic'
  }

  server.names.b = {
    appId: 'b'
  }

  server.reload()
})

tape('change path', t => {
  t.plan(3)

  server.once('unserve', path => {
    t.equal(path, __dirname + '/node_modules/ecstatic')
  })

  server.once('serve', path => {
    t.equal(path, __dirname + '/node_modules/mime')
    http.request({
      path: '/cli.js',
      port: 7357,
      headers: {
        host: 'b'
      }
    })
      .on('response', res => {
        var data = ''
        res.on('data', d => data += d)
        res.on('end', () => {
          t.equal(data, fs.readFileSync(__dirname + '/node_modules/mime/cli.js', 'utf8'))
        })
      })
      .end()
  })

  server.apps.b = {
    root: __dirname + '/node_modules/mime'
  }

  server.names.b = {
    appId: 'b'
  }

  server.reload()
})

tape('pass through ecstatic opts', t => {
  t.plan(2)

  http.request({
    path: '/cli.js',
    port: 7357,
    headers: {
      host: 'b'
    }
  })
    .on('response', res => {
      t.equal(res.headers['cache-control'], 'public,max-age=999')
      var data = ''
      res.on('data', d => data += d)
      res.on('end', () => {
        t.equal(data, fs.readFileSync(__dirname + '/node_modules/mime/cli.js', 'utf8'))
      })
    })
    .end()

  server.apps.b = {
    root: server.apps.b.root,
    ecstatic: {
      cache: 'public,max-age=999'
    }
  }

  server.reload()
})

tape('remove path', t => {
  t.plan(2)

  server.once('unserve', path => {
    t.equal(path, __dirname + '/node_modules/mime')
    http.request({
      path: '/test.js',
      port: 7357,
      headers: {
        host: 'b'
      }
    })
      .on('response', res => {
        var data = ''
        res.on('data', d => data += d)
        res.on('end', () => {
          t.equal(data, 'not found')
        })
      })
      .end()
  })

  server.apps.b = null

  server.reload()
})

tape('guard null bytes, missing host and prototype keys', t => {
  t.plan(3)

  http.request({
    path: '/%00.aws/%00config',
    port: 7357,
    headers: { host: 'localhost' }
  })
    .on('response', res => {
      t.equal(res.statusCode, 400)
      res.resume()
    })
    .end()

  const s = require('net').connect(7357, '127.0.0.1', () => {
    s.write('GET /index.js HTTP/1.0\r\n\r\n')
  })
  let raw = ''
  s.on('data', d => { raw += d })
  s.on('end', () => {
    t.match(raw, /^HTTP\/1\.1 404 Not Found\r\n/)
  })

  http.request({
    path: '/index.js',
    port: 7357,
    headers: { host: 'constructor' }
  })
    .on('response', res => {
      t.equal(res.statusCode, 404)
      res.resume()
    })
    .end()
})

tape('close', t => {
  t.plan(1)

  server.on('unserve', path => {
    t.equal(path, __dirname)
  })

  server.close()
})
