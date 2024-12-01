import { acceptHMRUpdate, defineStore } from 'pinia'
import { api } from '@/feathers'
import { useAuth } from 'feathers-pinia'
import { User } from 'musare-server';

export interface AuthenticateData {
  strategy: 'jwt' | 'local';
  accessToken?: string;
  identifier?: string;
  password?: string;
}

export const useAuthStore = defineStore('auth', () => {
  return useAuth<AuthenticateData, User>({ api, servicePath: 'users' });
});

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))