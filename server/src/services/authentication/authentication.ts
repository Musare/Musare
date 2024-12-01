// For more information about this file see https://dove.feathersjs.com/guides/cli/authentication.html
import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'
import { LocalStrategy as FeathersLocalStrategy } from '@feathersjs/authentication-local'

import type { Application } from '../../declarations'
import authenticationHooks from './authentication.hooks'
import { Params, Query } from '@feathersjs/feathers'

declare module '../../declarations' {
  interface ServiceTypes {
    authentication: AuthenticationService
  }
}

class LocalStrategy extends FeathersLocalStrategy {
  async getEntityQuery(query: Query, params: Params) {
    const key = query.identifier.indexOf('@') !== -1 ? 'email' : 'username';
    return {
      [key]: query.identifier,
      $limit: 1
    }
  }
}

export const authentication = (app: Application) => {
  const config = app.get('authentication')
  config!.local!.usernameField = 'identifier';
  app.set('authentication', config)

  const authentication = new AuthenticationService(app)

  authentication.register('jwt', new JWTStrategy())
  authentication.register('local', new LocalStrategy())

  app.use('authentication', authentication);

  app.service('authentication').hooks(authenticationHooks);
}
