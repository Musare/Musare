import { user } from './users/users'
// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html#configure-functions
import type { Application } from '../declarations'
import { authentication } from './authentication/authentication';

export const services = (app: Application) => {
  app.configure(authentication);
  app.configure(user);
  // All services will be registered here
}
