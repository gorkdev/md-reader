#!/usr/bin/env node
import readline from 'readline'
import { createUser } from '../server/services/userStore.js'

function ask(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()))
  })
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  console.log('\n  Create MD Reader user')
  console.log('  ─────────────────────\n')

  try {
    const username = await ask(rl, '  Username: ')
    if (!username) throw new Error('Username required')

    const displayName = await ask(rl, '  Display name: ')
    if (!displayName) throw new Error('Display name required')

    const password = await ask(rl, '  Password (visible): ')
    if (!password) throw new Error('Password required')
    if (password.length < 4) throw new Error('Password too short (min 4 chars)')

    const confirm = await ask(rl, '  Confirm password: ')
    if (password !== confirm) throw new Error('Passwords do not match')

    const roleInput = await ask(rl, '  Role (viewer / editor / admin) [editor]: ')
    const role = roleInput || 'editor'

    const user = await createUser({ username, displayName, password, role })
    console.log(`\n  ✓ Created: ${user.username} (${user.role}) — id ${user.id}\n`)
    rl.close()
  } catch (e) {
    console.error(`\n  ✗ ${e.message}\n`)
    rl.close()
    process.exit(1)
  }
}

main()
