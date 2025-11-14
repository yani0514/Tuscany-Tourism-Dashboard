import { useState, useEffect } from 'react'
import './App.css'
import Dashboard from './Dashboard/pages/Dashboard';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard></Dashboard>} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
