/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const rga = require('../../src/types/rga')
const ValueAfter = require('./helpers/text-array-value-after')

describe('rga', () => {
  it('gets the expected result after applying all the messages', () => {
    const valueAfter = ValueAfter(rga)
    expect(valueAfter('hello world')).to.equal('hello world')
    expect(valueAfter('he<el<<ello  <world<d')).to.equal('hello world')
    expect(valueAfter([['he', 'llo'], [' wor', 'ld']])).to.equal('hello world')
    expect(valueAfter(new Set(['hello', ' world']))).to.equal(' worldhello')
    expect(valueAfter([new Set(['hel', 'lo']), new Set([' wo', 'rld'])])).to.equal('lohelrld wo')
    expect(valueAfter('hello world0')).to.equal('0hello world')
    expect(valueAfter('hello world1')).to.equal('h1ello world')
  })
})
