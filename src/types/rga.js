'use strict'

// Replicable Growable Array (RGA)
// State is represented by 3 sets:
//   * Added Vertices (VA)
//   * Removed Vertices (VR)
//   * Edges (E)
//
// As defined in http://hal.upmc.fr/inria-00555588/document

const cuid = require('cuid')
const pull = require('pull-stream')

exports = module.exports = {
  first: () => [
    new Map([[null, null]]), // VA
    new Set(), // VR
    new Map()], // E

  reduce: (message, previous, changed) => {
    const state = [
      new Map([...previous[0]]),
      new Set([...previous[1]]),
      new Map([...previous[2]])
    ]

    const add = message[0]
    const addedVertices = state[0]
    if (add) {
      const beforeVertex = add[0]
      if (addedVertices.has(beforeVertex)) {
        const value = add[1]
        const id = add[2]
        addedVertices.set(id, value)

        const edges = state[2]

        let l = beforeVertex
        let r = edges.get(beforeVertex)
        while (addedVertices.has(r) && r > id) {
          l = r
          r = edges.get(r)
        }
        edges.set(l, id)
        edges.set(id, r)
        changed({type: 'insert', value, pos: posFor(id, state)})
      }
    }

    const remove = message[1]
    if (remove) {
      const removedVertices = state[1]
      changed({type: 'remove', pos: posFor(remove, state)})
      removedVertices.add(remove)
    }

    return state
  },

  valueOf: (state) => {
    const [addedVertices, removedVertices, edges] = state
    const result = []
    let id = edges.get(null)
    while (id) {
      if (!removedVertices.has(id)) {
        result.push(addedVertices.get(id))
      }
      id = edges.get(id)
    }

    return result
  },

  mutators: {
    addRight (beforeVertex, value) {
      const state = this
      const added = state[0]
      const removed = state[1]

      if (added.has(beforeVertex) && !removed.has(beforeVertex)) {
        return [[beforeVertex, value, cuid()]]
      }
    },

    push (value) {
      const state = this
      const edges = state[2]
      let id = null
      let edge
      do {
        edge = edges.get(id)
        if (edge) {
          id = edge
        }
      } while (edge)

      return [[id || null, value, cuid()]]
    },

    remove (vertex) {
      const state = this
      const [added, removed] = state
      if (added.has(vertex) && !removed.has(vertex)) {
        return [null, vertex]
      }
    },

    removeAt (pos) {
      const state = this
      const removed = state[1]
      const edges = state[2]
      let i = -1
      let id = null
      while (i < pos) {
        if (edges.has(id)) {
          id = edges.get(id)
        } else {
          throw new Error('nothing at pos ' + pos)
        }
        if (!removed.has(id)) {
          i++
        }
      }

      return exports.mutators.remove.call(state, id)
    },

    set (pos, value) {
      const state = this
      const messages = []
      const edges = state[2]
      let i = -1
      let id = null
      while (i < pos) {
        let next
        if (edges.has(id)) {
          next = edges.get(id)
        }
        if (!next) {
          next = cuid()
          messages.push([[id, null, next]])
        }
        id = next
        i++
      }
      if (edges.has(id)) {
        messages.push(exports.mutators.remove.call(state, id)) // remove
      }
      messages.push([[id, value, cuid()]])
      return pull.values(messages)
    },

    insertAt (pos, value) {
      const state = this
      const messages = []
      const edges = state[2]
      let i = 0
      let id = null
      while (i < pos) {
        let next
        if (edges.has(id)) {
          next = edges.get(id)
        }
        if (!next) {
          next = cuid()
          messages.push([[id, null, next]])
        }
        id = next
        i++
      }
      messages.push(exports.mutators.addRight.call(state, id, value))
      if (!messages.length) {
        return
      }
      if (messages.length === 1) {
        return messages[0]
      }
      return pull.values(messages)
    }
  }
}

function posFor (id, state) {
  const edges = state[2]
  let it = null
  let pos = -1
  do {
    pos++
    it = edges.get(it)
  } while (it && it !== id)
  if (!it) {
    pos = -1
  }

  return pos
}
