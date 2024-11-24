import { acceptHMRUpdate, defineStore } from 'pinia'
import { api } from '@/feathers'
import { useAuth } from 'feathers-pinia'

export const useAuthStore = defineStore('auth', () => {
  const auth = useAuth({ api, servicePath: 'users' });
  auth.reAuthenticate();
  return auth;
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))