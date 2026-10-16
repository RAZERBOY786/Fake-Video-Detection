import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import SplashScreen from './components/SplashScreen.jsx'
import VideoAnalysis from './pages/VideoAnalysis.jsx'
import ModelArchitecture from './pages/ModelArchitecture.jsx'
import Reports from './pages/Reports.jsx'
import Benchmarks from './pages/Benchmarks.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function App() {
  return (
    <>
      <SplashScreen />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<VideoAnalysis />} />
            <Route path="architecture" element={<ModelArchitecture />} />
            <Route path="reports" element={<Reports />} />
            <Route path="benchmarks" element={<Benchmarks />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}
