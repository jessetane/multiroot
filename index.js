var EventEmitter = require('events')
var http = require('http')
var ecstatic = require('ecstatic')

module.exports = class FileServer extends EventEmitter {
  constructor (opts = {}) {
    super()
    this._onhttpRequest = this._onhttpRequest.bind(this)

    // public state
    this.apps = {}
    this.names = {}

    // one per unique path
    this._handlers = {}

    // http server to handle domain validation
    this.port = opts.port || 80
    this._httpServer = new http.Server()
    this._httpServer.on('request', this._onhttpRequest)
    this._httpServer.listen(this.port, err => {
      if (err) throw err
      this.emit('listen', this.port)
    })
  }

  close () {
    for (var path in this._handlers) {
      this._destroyHandler(path)
    }
    this._httpServer.close()
  }

  reload () {
    var active = {}
    for (var id in this.apps) {
      var app = this.apps[id]
      if (app && app.root) {
        active[app.root] = true
        if (!this._handlers[app.root]) {
          this._createHandler(app.root)
        }
      }
    }
    for (var path in this._handlers) {
      if (!active[path]) {
        this._destroyHandler(path)
      }
    }
  }

  notFound (req, res) {
    res.statusCode = 404
    res.end('not found')
  }

  _createHandler (path) {
    var handler = ecstatic(path, { cache: 'no-cache' })
    this._handlers[path] = handler
    this.emit('serve', path)
  }

  _destroyHandler (path) {
    var handler = this._handlers[path]
    delete this._handlers[path]
    this.emit('unserve', path)
  }

  _onhttpRequest (req, res) {
    this.emit('request', req, res)
    var name = this.names[req.headers.host.split(':')[0]]
    var appId = name && name.appId
    var app = appId && this.apps[appId]
    var handler = app && this._handlers[app.root]
    if (handler) {
      if (app.singlePage) {
        handler(req, res, () => {
          req.url = '/'
          handler(req, res, () => {
            this.notFound(req, res)
          })
        })
      } else {
        handler(req, res, () => {
          this.notFound(req, res)
        })
      }
    } else {
      this.notFound(req, res)
    }
  }
}
