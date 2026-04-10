import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { getToken } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const socketRef = useRef(null)
  const [presence, setPresence] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setConnected(false)
      setPresence([])
      return
    }
    const token = getToken()
    if (!token) return

    const socket = io({
      auth: { token },
      reconnection: true,
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('presence:update', list => setPresence(list))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated])

  const on = useCallback((event, handler) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on(event, handler)
    return () => s.off(event, handler)
  }, [])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, presence, on }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
