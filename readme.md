# multiroot
A static file server with > 1 document root.

## Why
Wanted an embeddable file server that could be reconfigured dynamically for small vhosting setups and tinkering.

## How
[ecstatic](https://github.com/jfhbrook/node-ecstatic)

## Example
```javascript
var server = new MultiRoot({ port: 8080 })

server.apps = {
  a: {
    root: __dirname,
    singlePage: true // 'if a file is not found, the url will be changed to / and the handler retried 1x'
  },
  b: {
    root: __dirname + '/node_modules'
  }
}

server.names = {
  a: {
    appId: 'a'
  },
  b: {
    appId: 'b'
  },
  www.b: {
    appId: 'b'
  }
}

server.on('serve', path => {
  console.log('serve', path)
})

server.on('listen', port => {
  console.log('listening on ' + port) // 8080
})

server.reload()
```

## License
MIT
