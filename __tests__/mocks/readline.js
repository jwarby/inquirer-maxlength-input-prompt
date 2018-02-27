const EventEmitter = require('events').EventEmitter
const util = require('util')

const assign = require('lodash.assign')

const stub = {
  write: jest.fn().mockReturnThis(),
  moveCursor: jest.fn().mockReturnThis(),
  setPrompt: jest.fn().mockReturnThis(),
  close: jest.fn().mockReturnThis(),
  pause: jest.fn().mockReturnThis(),
  resume: jest.fn().mockReturnThis(),
  _getCursorPos: jest.fn().mockReturnValue({
    cols: 0,
    rows: 0
  }),
  output: {
    end: jest.fn(),
    mute: jest.fn(),
    unmute() {
      this.__raw__ = ''
    },
    __raw__: '',
    write: function(str) {
      this.__raw__ += str
    }
  }
}

const ReadlineStub = function() {
  this.line = ''
  this.input = new EventEmitter()
  this.history = []
  EventEmitter.apply(this, arguments)

  this.on('line', line => this.history.push(line))
}

util.inherits(ReadlineStub, EventEmitter)

assign(ReadlineStub.prototype, stub)

module.exports = ReadlineStub
