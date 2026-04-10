import path from 'path'
import { DATA_ROOT } from '../utils/root.js'
import { createLockManager } from './lockManager.js'

export const locks = await createLockManager({
  lockFile: path.join(DATA_ROOT, 'locks.json'),
  staleMs: 2 * 60 * 1000,
})
