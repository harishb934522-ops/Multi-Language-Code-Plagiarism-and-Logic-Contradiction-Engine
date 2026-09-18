import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/clerk-react'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'
import ChooseRole from './pages/ChooseRole'
import StudentDashboard from './pages/StudentDashboard'
import StudentAssessment from './pages/StudentAssessment'
import TutorDashboard from './pages/TutorDashboard'
import TutorAssessment from './pages/TutorAssessment'
import TutorReport from './pages/TutorReport'
import TutorGraph from './pages/TutorGraph'
import Layout from './components/Layout'
import { ThemeProvider } from './components/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <Navigate to="/choose-role" replace />
          } />
          <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
          <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
          
          <Route path="/choose-role" element={
            <ProtectedRoute>
              <ChooseRole />
            </ProtectedRoute>
          } />
          
          <Route path="/student-dashboard" element={
            <ProtectedRoute role="student">
              <Layout role="student"><StudentDashboard /></Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/student-dashboard/assessment/:id" element={
            <ProtectedRoute role="student">
              <Layout role="student"><StudentAssessment /></Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/tutor-dashboard" element={
            <ProtectedRoute role="tutor">
              <Layout role="tutor"><TutorDashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tutor-dashboard/assessment/:id" element={
            <ProtectedRoute role="tutor">
              <Layout role="tutor"><TutorAssessment /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tutor-dashboard/assessment/:id/submission/:submissionId" element={
            <ProtectedRoute role="tutor">
              <Layout role="tutor"><TutorReport /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tutor-dashboard/assessment/:id/graph" element={
            <ProtectedRoute role="tutor">
              <Layout role="tutor"><TutorGraph /></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
