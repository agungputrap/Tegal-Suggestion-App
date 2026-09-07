import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomeMap } from './pages/HomeMap'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeMap />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
