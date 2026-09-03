import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Home from './site/Home'
import Technical from './site/Technical'

// Lazy so the editor — and the upload SDK it pulls in — never ships to
// visitors who only ever load the public page.
const Update = lazy(() => import('./admin/Update'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The work is the front of the site; the about page hangs off it. */}
        <Route path="/" element={<Technical />} />
        <Route path="/home" element={<Home />} />
        {/* The projects used to live here, and links to that address are
            already out in the world. */}
        <Route path="/technical" element={<Navigate to="/" replace />} />
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
