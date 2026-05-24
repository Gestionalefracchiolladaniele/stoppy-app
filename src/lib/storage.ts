import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const cache = new Map<string, string>();
let initialized = false;

const KEYS = ['app_language', 'noit.last_daily_notif'];

async function initCache(): Promise<void> {
  if (initialized) return;
  if (Platform.OS === 'web') {
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      if (v !== null) cache.set(k, v);
    }
  } else {
    for (const k of KEYS) {
      const v = await AsyncStorage.getItem(k);
      if (v !== null) cache.set(k, v);
    }
  }
  initialized = true;
}

void initCache();

export const Storage = {
  getString: (key: string): string | undefined => cache.get(key),
  set: (key: string, value: string): void => {
    cache.set(key, value);
    if (Platform.OS === 'web') localStorage.setItem(key, value);
    else void AsyncStorage.setItem(key, value);
  },
  delete: (key: string): void => {
    cache.delete(key);
    if (Platform.OS === 'web') localStorage.removeItem(key);
    else void AsyncStorage.removeItem(key);
  },
  contains: (key: string): boolean => cache.has(key),
};

export { initCache };
