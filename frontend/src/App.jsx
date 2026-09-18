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

function App() {
  return (
    <>
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
              <StudentDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/student-dashboard/assessment/:id" element={
            <ProtectedRoute role="student">
              <StudentAssessment />
            </ProtectedRoute>
          } />
          
          <Route path="/tutor-dashboard" element={
            <ProtectedRoute role="tutor">
              <TutorDashboard />
            </ProtectedRoute>
          } />

          <Route path="/tutor-dashboard/assessment/:id" element={
            <ProtectedRoute role="tutor">
              <TutorAssessment />
            </ProtectedRoute>
          } />

          <Route path="/tutor-dashboard/assessment/:id/submission/:submissionId" element={
            <ProtectedRoute role="tutor">
              <TutorReport />
            </ProtectedRoute>
          } />

          <Route path="/tutor-dashboard/assessment/:id/graph" element={
            <ProtectedRoute role="tutor">
              <TutorGraph />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
