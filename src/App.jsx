import { Routes, Route } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import FilePage from '@/pages/FilePage'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/file/:id"
        element={
          <ProtectedRoute>
            <FilePage mode="view" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/file/:id/edit"
        element={
          <ProtectedRoute minRole="editor">
            <FilePage mode="edit" />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
