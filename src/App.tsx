import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import Home from './site/Home'
import Technical from './site/Technical'

// Lazy so the editor — and the upload SDK it pulls in — never ships to
// visitors who only ever load the public page.
const Update = lazy(() => import('./admin/Update'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/technical" element={<Technical />} />
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
