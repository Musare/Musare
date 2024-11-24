import { acceptHMRUpdate, defineStore } from 'pinia'
import { api } from '@/feathers'
import { useAuth } from 'feathers-pinia'

export const useAuthStore = defineStore('auth', () => {
  return useAuth({ api, servicePath: 'users' });
});

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))