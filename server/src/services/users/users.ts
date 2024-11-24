// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  userDataValidator,
  userPatchValidator,
  userQueryValidator,
  userResolver,
  userExternalResolver,
  userDataResolver,
  userPatchResolver,
  userQueryResolver
} from './users.schema'

import type { Application, HookContext } from '../../declarations'
import { UserService, getOptions } from './users.class'
import { userPath, userMethods } from './users.shared'
import { authorize } from 'feathers-casl'
import { defineAbilitiesFor } from '../authentication/authentication.abilities'

export * from './users.class'
export * from './users.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const user = (app: Application) => {
  // Register our service on the Feathers application
  app.use(userPath, new UserService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: userMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  const authorizeHook = authorize({ adapter: "@feathersjs/knex" });
  // Initialize hooks
  app.service(userPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(userExternalResolver), schemaHooks.resolveResult(userResolver)],
      find: [authenticate('jwt'), authorizeHook],
      get: [],
      create: [],
      update: [authenticate('jwt'), authorizeHook],
      patch: [authenticate('jwt'), authorizeHook],
      remove: [authenticate('jwt'), authorizeHook]
    },
    before: {
      all: [schemaHooks.validateQuery(userQueryValidator), schemaHooks.resolveQuery(userQueryResolver)],
      find: [],
      get: [
        authenticate('jwt'),
        (context: HookContext) => {
          if (context.params.ability) { return context; }
          const { user } = context.params
          if (user) context.params.ability = defineAbilitiesFor(user)
          return context
        },
        authorizeHook,
      ],
      create: [schemaHooks.validateData(userDataValidator), schemaHooks.resolveData(userDataResolver)],
      update: [],
      patch: [schemaHooks.validateData(userPatchValidator), schemaHooks.resolveData(userPatchResolver)],
      remove: []
    },
    after: {
      all: [],
      get: [authorizeHook]
    },
    error: {
      all: []
    }
  })
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    [userPath]: UserService
  }
}
