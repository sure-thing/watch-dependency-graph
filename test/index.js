const fs = require('fs-extra')
const path = require('path')
const test = require('baretest')('presta')
const assert = require('assert')

const DELAY = 300
const wait = t => new Promise(r => setTimeout(r, t))

const fixturesRoot = path.join(__dirname, 'fixtures')
const fixtures = {
  childOfChildren: path.join(fixturesRoot, 'childOfChildren.js'),
  childOfA: path.join(fixturesRoot, 'childOfA.js'),
  childOfB: path.join(fixturesRoot, 'childOfB.js'),
  A: path.join(fixturesRoot, 'A.js'),
  B: path.join(fixturesRoot, 'B.js'),
}

/*
 * Change cwd to /test
 */
process.chdir(__dirname)

let instance

test.before(() => {
  fs.ensureDirSync(fixturesRoot)
  fs.outputFileSync(fixtures.childOfChildren, `module.exports = {}`)
  fs.outputFileSync(fixtures.childOfA, `require('${fixtures.childOfChildren}')`)
  fs.outputFileSync(fixtures.childOfB, `require('${fixtures.childOfChildren}')`)
  fs.outputFileSync(fixtures.A, `require('${fixtures.childOfA}')`)
  fs.outputFileSync(fixtures.B, `require('${fixtures.childOfB}')`)

  instance = require('../')('', ['./fixtures/A.js', './fixtures/B.js'])
})

test.after(() => {
  instance.close()
  fs.removeSync(fixturesRoot)
})

test('update main entries', async () => {
  const updated = []

  const close = instance.on('update', mod => updated.push(mod.id))

  fs.outputFileSync(fixtures.A, fs.readFileSync(fixtures.A))
  fs.outputFileSync(fixtures.B, fs.readFileSync(fixtures.B))

  await wait(DELAY)

  assert(updated.length >= 2)
  assert(updated.includes(fixtures.A))
  assert(updated.includes(fixtures.B))

  close()
})

test('update single child', async () => {
  const updated = []

  const close = instance.on('update', mod => updated.push(mod.id))

  fs.outputFileSync(fixtures.childOfA, fs.readFileSync(fixtures.childOfA))

  await wait(DELAY)

  assert(updated.length >= 1)
  assert(updated.includes(fixtures.A))

  close()
})

test('update common nested child', async () => {
  const updated = []

  const close = instance.on('update', mod => updated.push(mod.id))

  fs.outputFileSync(fixtures.childOfChildren, fs.readFileSync(fixtures.childOfChildren))

  await wait(DELAY)

  assert(updated.length >= 2)
  assert(updated.includes(fixtures.A))
  assert(updated.includes(fixtures.B))

  close()
})

test.only('update common nested child after ancestor removal', async () => {
  fs.outputFileSync(fixtures.childOfA, '') // remove child

  await wait(DELAY)

  console.log(instance.register)

  const updated = []

  const close = instance.on('update', mod => updated.push(mod.id))

  fs.outputFileSync(fixtures.childOfChildren, fs.readFileSync(fixtures.childOfChildren))

  await wait(DELAY)

  assert(updated.length === 1)
  assert(!updated.includes(fixtures.A))
  assert(updated.includes(fixtures.B))

  close()
})

!(async function () {
  console.time('test')
  await test.run()
  console.timeEnd('test')
})()
