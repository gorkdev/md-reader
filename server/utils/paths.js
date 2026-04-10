import path from 'path'
import { PROJECT_ROOT } from './root.js'

// base64url-encode a relative path for use as a URL :id parameter
export function encodeId(relativePath) {
  return Buffer.from(relativePath, 'utf8').toString('base64url')
}

// Decode :id back to a relative path
export function decodeId(id) {
  return Buffer.from(id, 'base64url').toString('utf8')
}

// Resolve a relative path under a given root dir, throw if it escapes
export function safeResolve(rootDir, relativePath) {
  const absRoot = path.resolve(PROJECT_ROOT, rootDir)
  const cleaned = relativePath.replace(/^\/+/, '')
  const absTarget = path.resolve(absRoot, cleaned)
  if (absTarget !== absRoot && !absTarget.startsWith(absRoot + path.sep)) {
    throw new Error('Path traversal attempt blocked')
  }
  return absTarget
}
