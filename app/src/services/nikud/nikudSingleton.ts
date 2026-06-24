import { NikudService } from './nikudService';
import { createIdbNikudCache } from './nikudCache';
import { createNakdanFetcher } from './nakdanClient';

export const globalNikudService = new NikudService(
  createIdbNikudCache(),
  createNakdanFetcher(),
  () => typeof navigator !== 'undefined' && navigator.onLine,
);
