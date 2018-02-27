const invoke = require('lodash.invoke')
const last = require('lodash.last')
const stripAnsi = require('strip-ansi')
const partial = require('lodash.partial')
const partialRight = require('lodash.partialright')
const repeat = require('lodash.repeat')

const Prompt = require('../')
const pkg = require('../package.json')

const { VALIDATION_ERROR_MESSAGE } = Prompt

const {
  createExpectation,
  defaultPromptOptions,
  getCounter,
  setup,
  type,
  wait
} = require('./helpers')

describe(pkg.name, () => {
  it('should throw an error if `options.maxLength` is not provided', () => {
    expect(() => {
      new Prompt(defaultPromptOptions)
    }).toThrowError('You must provide a `maxLength` parameter')
  })

  describe('character counter', () => {
    /* Technically, Jest snapshot testing would be much simpler to implement
     * here - however, it would also be a nightmare to debug if a test breaks
     * due to the ANSI output
     */
    it('should render correctly', () => {
      const maxLength = 20
      const { rl, prompt } = setup({ maxLength })

      const expected = partial(
        createExpectation,
        defaultPromptOptions.message,
        maxLength
      )

      prompt.run()

      const cases = ['', 'T', 'esting', ' testing testing testing']

      expect.assertions(cases.length)

      cases.reduce((input, chars) => {
        input += type(chars, rl)

        const output = stripAnsi(rl.output.__raw__)

        expect(output).toEqual(expected(input))

        return input
      }, '')
    })

    describe('colours', () => {
      it('should display in green if typed characters < 80% of max', () => {
        const maxLength = 20
        const { rl, prompt } = setup({ maxLength })

        prompt.run()

        expect(getCounter(rl)).toEqual({ color: 'green', value: 0 })

        for (let i = 1; i < Math.floor(maxLength * 0.8); i++) {
          type('a', rl)

          expect(getCounter(rl)).toEqual({ color: 'green', value: i })
        }
      })

      it('should display in yellow if typed characters are 80-100% of max', () => {
        const maxLength = 20
        const { rl, prompt } = setup({ maxLength })

        prompt.run()

        const startAt = Math.round(maxLength * 0.8)

        type(repeat('b', startAt), rl)

        expect(getCounter(rl)).toEqual({
          color: 'yellow',
          value: startAt
        })

        const iterations = startAt + maxLength - startAt

        for (let i = startAt + 1; i <= iterations; i++) {
          type('b', rl)

          expect(getCounter(rl)).toEqual({ color: 'yellow', value: i })
        }
      })

      it('should display in red if typed characters > 100% of max', () => {
        const maxLength = 20
        const { rl, prompt } = setup({ maxLength })

        prompt.run()

        const repeatTimes = maxLength + 1
        type(repeat('c', repeatTimes), rl)

        expect(getCounter(rl)).toEqual({ color: 'red', value: repeatTimes })
      })
    })
  })

  describe('validation', () => {
    const assertRenderCalledWithError = partialRight(
      invoke,
      'toHaveBeenCalledWith',
      VALIDATION_ERROR_MESSAGE
    )

    it('should fail if `maxLength` is exceeded', () => {
      expect.assertions(1)

      const maxLength = 10
      const { rl, prompt } = setup({ maxLength })

      prompt.render = jest.fn()
      prompt.run()

      type(repeat('d', maxLength + 1), rl, true)

      return wait().then(() => {
        assertRenderCalledWithError(expect(prompt.render))
      })
    })

    it('should succeed if typed value length is less than `maxLength`', () => {
      expect.assertions(2)

      const maxLength = 10
      const { rl, prompt } = setup({ maxLength })
      prompt.render = jest.fn()
      const result = prompt.run()

      const input = type(repeat('d', maxLength - 2), rl, true)

      return result.then(answer => {
        assertRenderCalledWithError(expect(prompt.render).not)
        expect(answer).toEqual(input)
      })
    })

    it('should succeed if typed value length is equal to `maxLength`', () => {
      expect.assertions(2)

      const maxLength = 10
      const { rl, prompt } = setup({ maxLength })
      prompt.render = jest.fn()
      const result = prompt.run()

      const input = type(repeat('d', maxLength), rl, true)

      return result.then(answer => {
        assertRenderCalledWithError(expect(prompt.render).not)
        expect(answer).toEqual(input)
      })
    })

    it('should succeed if nothing typed', () => {
      expect.assertions(2)

      const maxLength = 10
      const { rl, prompt } = setup({ maxLength })
      prompt.render = jest.fn()
      const result = prompt.run()

      const input = type('', rl, true)

      return result.then(answer => {
        assertRenderCalledWithError(expect(prompt.render).not)
        expect(answer).toEqual(input)
      })
    })

    it('should run user validation if `maxLength` validation succeeds', () => {
      expect.assertions(3)

      const validate = jest.fn().mockReturnValue(true)
      const { rl, prompt } = setup({
        maxLength: 10,
        validate
      })
      prompt.render = jest.fn()
      const result = prompt.run()

      const input = type('ok', rl, true)

      return result.then(answer => {
        assertRenderCalledWithError(expect(prompt.render).not)
        expect(validate).toHaveBeenCalledWith(input, undefined, input)
        expect(answer).toEqual(input)
      })
    })
  })

  it('should render correctly after being answered', () => {
    expect.assertions(2)

    const maxLength = 20
    const { rl, prompt } = setup({ maxLength })

    prompt.screen.render = jest.fn()
    prompt.run()

    const input = 'abc'

    type(input, rl, true)

    return wait().then(() => {
      const args = last(prompt.screen.render.mock.calls)
      ;[`? ${defaultPromptOptions.message} ${input}`, ''].forEach((arg, i) => {
        expect(stripAnsi(args[i])).toEqual(arg)
      })
    })
  })

  it('should render an error if validation fails', () => {
    expect.assertions(2)

    const maxLength = 20
    const { rl, prompt } = setup({ maxLength })

    prompt.screen.render = jest.fn()
    prompt.run()

    const input = type(repeat('f', maxLength + 1), rl, true)

    return wait().then(() => {
      const args = last(prompt.screen.render.mock.calls)
      ;[
        `? ${defaultPromptOptions.message} ${input}`,
        `>> ${VALIDATION_ERROR_MESSAGE}`
      ].forEach((arg, i) => {
        expect(stripAnsi(args[i])).toEqual(arg)
      })
    })
  })

  it('should render correctly when `transformer` option supplied', () => {
    const maxLength = 10
    const transformer = input => `myPrefix: ${input}`

    const { rl, prompt } = setup({ maxLength, transformer })

    prompt.screen.render = jest.fn()
    prompt.run()

    const input = repeat('with', rl)

    return wait().then(() => {
      const args = last(prompt.screen.render.mock.calls)
      ;[
        `? ${defaultPromptOptions.message} ${transformer(input)}`,
        `(${input.length}/${maxLength} characters)`
      ].forEach((arg, i) => {
        expect(stripAnsi(args[i])).toEqual(arg)
      })
    })
  })

  it('should use filtered input value when counting characters', () => {
    const maxLength = 12

    const filter = input => input + '!!!'

    const { rl, prompt } = setup({ maxLength, filter })

    prompt.screen.render = jest.fn()
    prompt.run()

    const input = repeat('with', rl)

    return wait().then(() => {
      const args = last(prompt.screen.render.mock.calls)
      ;[
        `? ${defaultPromptOptions.message} ${input}`,
        `(${filter(input).length}/${maxLength} characters)`
      ].forEach((arg, i) => {
        expect(stripAnsi(args[i])).toEqual(arg)
      })
    })
  })
})
