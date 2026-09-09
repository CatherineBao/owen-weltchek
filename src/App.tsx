import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Home from './site/Home'

// Lazy so the editor — and the upload SDK it pulls in — never ships to
// visitors who only ever load the public page.
const Update = lazy(() => import('./admin/Update'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* One page: the mark, the clock and the work all live at the root. */}
        <Route path="/" element={<Home />} />
        {/* The two halves used to be pages of their own, and links to both
            addresses are already out in the world. */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/projects" element={<Navigate to="/" replace />} />
        <Route
          path="/update"
          element={
            <Suspense fallback={null}>
              <Update />
            </Suspense>
          }
        />
        <Route path="*" element={<main><p>Not found</p></main>} />
      </Routes>
    </BrowserRouter>
  )
}
