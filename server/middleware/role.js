const ORDER = { viewer: 0, editor: 1, admin: 2 }

export function requireRole(minRole) {
  return (req, res, next) => {
    const userLevel = ORDER[req.user?.role] ?? -1
    const needed = ORDER[minRole] ?? 99
    if (userLevel < needed) {
      return res.status(403).json({ error: `Requires role: ${minRole}` })
    }
    next()
  }
}
