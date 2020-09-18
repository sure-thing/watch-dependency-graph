const fs = require('fs-extra')
const test = require('baretest')('presta')
const assert = require('assert')

const { fixtures } = require('./fixtures.js')

function subscribe (instance) {
  return new Promise(r => {
    const close = instance.on('update', ids => {
      close()
      r(ids)
    })
  })
}

test('update main entries', async () => {
  const instance = require('./')(['./fixtures/A.js', './fixtures/B.js'])

  const A = subscribe(instance)

  fs.outputFileSync(fixtures.A, fs.readFileSync(fixtures.A))

  assert((await A).includes(fixtures.A))

  const B = subscribe(instance)

  fs.outputFileSync(fixtures.B, fs.readFileSync(fixtures.B))

  assert((await B).includes(fixtures.B))

  await instance.close()
})

test('update single child', async () => {
  const instance = require('./')(['./fixtures/A.js', './fixtures/B.js'])

  const subscriber = subscribe(instance)

  fs.outputFileSync(fixtures.childOfA, fs.readFileSync(fixtures.childOfA))

  const updated = await subscriber

  assert(updated.length >= 1)
  assert(updated.includes(fixtures.A))

  await instance.close()
})

test('update common nested child', async () => {
  const instance = require('./')(['./fixtures/A.js', './fixtures/B.js'])

  const subscriber = subscribe(instance)

  fs.outputFileSync(
    fixtures.childOfChildren,
    fs.readFileSync(fixtures.childOfChildren)
  )

  const updated = await subscriber

  assert(updated.length >= 2)
  assert(updated.includes(fixtures.A))
  assert(updated.includes(fixtures.B))

  await instance.close()
})

test('update common nested child after ancestor removal', async () => {
  const instance = require('./')(['./fixtures/A.js', './fixtures/B.js'])

  const A = subscribe(instance)

  fs.outputFileSync(fixtures.childOfA, '') // remove child

  const updatedA = await A

  assert(updatedA.length === 1)
  assert(updatedA[0] === fixtures.A)

  const child = subscribe(instance)

  fs.outputFileSync(
    fixtures.childOfChildren,
    fs.readFileSync(fixtures.childOfChildren)
  )

  assert((await child).pop() === fixtures.B)

  await instance.close()
})

test('ensure shared deps are both mapped to entries', async () => {
  const { register, close } = require('./')([
    './fixtures/A.js',
    './fixtures/B.js'
  ])

  assert(register[fixtures.commonDep].entries.length === 2)

  await close()
})

test('handles circular deps', async () => {
  fs.outputFileSync(
    fixtures.childOfA,
    `require('${fixtures.childOfChildren}');require('${fixtures.commonDep}')`
  )

  const { register, close } = require('./')([
    './fixtures/A.js',
    './fixtures/B.js'
  ])

  assert(register[fixtures.commonDep].entries.length === 2)

  await close()
})

!(async function () {
  console.time('test')
  await test.run()
  console.timeEnd('test')
})()