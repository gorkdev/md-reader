import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
export const CONTENT_ROOT = path.join(PROJECT_ROOT, 'content')
export const DATA_ROOT = path.join(PROJECT_ROOT, 'data')
export const DIST_DIR = path.join(PROJECT_ROOT, 'dist')
