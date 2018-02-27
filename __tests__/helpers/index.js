const assign = require('lodash.assign')
const parseAnsiStyles = require('ansi-style-parser')

const Prompt = require('../../')

const ReadlineStub = require('../mocks/readline')

const defaultPromptOptions = {
  name: 'name',
  message: 'Enter your name'
}

module.exports = {
  defaultPromptOptions,

  wait: () =>
    new Promise(resolve => {
      setTimeout(resolve)
    }),

  setup: options => {
    const rl = new ReadlineStub()
    rl.id = Math.random() * 50
    const prompt = new Prompt(assign({}, defaultPromptOptions, options), rl)

    return { rl, prompt }
  },

  createExpectation: (message, maxLength, typedInput) =>
    `? ${message} ${typedInput}
(${typedInput.length}/${maxLength} characters)`,

  type: (chars, rl, pressReturnKey = false) => {
    chars.split('').forEach(char => {
      rl.line += char
      rl.input.emit('keypress', char)
    })

    if (pressReturnKey) {
      rl.emit('line', rl.line)
    }

    return chars
  },

  getCounter: rl => {
    const line = rl.output.__raw__.split('\n')[1]

    const { styles, text } = parseAnsiStyles(line)[1]

    return { color: styles.join(''), value: parseInt(text, 10) }
  }
}
