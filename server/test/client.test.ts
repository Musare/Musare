import assert from 'assert'
import axios from 'axios'
import type { Server } from 'http'
import { app } from '../src/app'
import { createClient } from '../src/client'

import rest from '@feathersjs/rest-client'

const port = app.get('port')
const appUrl = `http://${app.get('host')}:${port}`

describe('client tests', () => {
  const client = createClient(rest(appUrl).axios(axios))

  it('initialized the client', () => {
    assert.ok(client)
  })
})
