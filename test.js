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
          t.equal(data, fs.readFileSync(__dirname + '/node_modules/ecstatic/test.js', 'utf8'))
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

tape('close', t => {
  t.plan(1)

  server.on('unserve', path => {
    t.equal(path, __dirname)
  })

  server.close()
})
