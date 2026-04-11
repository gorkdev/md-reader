#!/usr/bin/env node
import readline from 'readline'
import { createUser } from '../server/services/userStore.js'

const COLORS = [
  { name: 'Blue',   value: '#60a5fa' },
  { name: 'Green',  value: '#4ade80' },
  { name: 'Orange', value: '#fb923c' },
  { name: 'Pink',   value: '#f472b6' },
  { name: 'Yellow', value: '#facc15' },
  { name: 'Teal',   value: '#2dd4bf' },
  { name: 'Purple', value: '#a78bfa' },
  { name: 'Red',    value: '#f87171' },
]

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

    console.log('\n  Colors:')
    COLORS.forEach((c, i) => console.log(`    ${i + 1}. ${c.name}`))
    const colorInput = await ask(rl, `\n  Color (1-${COLORS.length}) [1]: `)
    const colorIdx = parseInt(colorInput || '1', 10) - 1
    const color = COLORS[colorIdx >= 0 && colorIdx < COLORS.length ? colorIdx : 0].value

    const user = await createUser({ username, displayName, password, role, color })
    console.log(`\n  ✓ Created: ${user.username} (${user.role}) — id ${user.id} — color ${color}\n`)
    rl.close()
  } catch (e) {
    console.error(`\n  ✗ ${e.message}\n`)
    rl.close()
    process.exit(1)
  }
}

main()
