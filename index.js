var EventEmitter = require('events')
var http = require('http')
var ecstatic = require('ecstatic')

module.exports = class FileServer extends EventEmitter {
  constructor (opts = {}) {
    super()

    // port to listen on
    this.port = opts.port || 80
    this.ecstaticOpts = opts.ecstatic || { cache: 'no-cache' }

    // public state
    this.apps = {}
    this.names = {}

    // one per unique path
    this._handlers = {}

    this._httpServer = new http.Server()
    this._httpServer.on('request', this._onhttpRequest.bind(this))
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
        var path = app.root
        var handler = this._handlers[path]
        if (!handler) {
          this._createHandler(app)
        } else if (handler._multirootApp !== app) {
          this._createHandler(app, true)
        }
        active[path] = true
      }
    }
    for (path in this._handlers) {
      if (!active[path]) {
        this._destroyHandler(path)
      }
    }
  }

  notFound (req, res) {
    res.statusCode = 404
    res.end('not found')
  }

  _createHandler (app, change = false) {
    var path = app.root
    var handler = ecstatic(path, app.ecstatic || this.ecstaticOpts)
    handler._multirootApp = app
    this._handlers[path] = handler
    this.emit(change ? 'change' : 'serve', path, app)
  }

  _destroyHandler (path) {
    var handler = this._handlers[path]
    delete this._handlers[path]
    this.emit('unserve', path, handler._multirootApp)
  }

  _onhttpRequest (req, res) {
    this.emit('request', req, res)
    if (!req.url || req.url.includes('\0') || /%00/.test(req.url)) {
      res.statusCode = 400
      res.end('bad request')
      return
    }
    var host = (req.headers.host || '').split(':')[0].toLowerCase()
    var name = Object.hasOwn(this.names, host) ? this.names[host] : null
    var appId = name?.appId || name
    var app = appId && Object.hasOwn(this.apps, appId) ? this.apps[appId] : null
    var handler = app && Object.hasOwn(this._handlers, app.root) ? this._handlers[app.root] : null
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
