import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import ComingNext from './pages/ComingNext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="skills" element={<ComingNext name="Skills Explorer" />} />
          <Route path="salary" element={<ComingNext name="Salary Benchmarks" />} />
          <Route path="access" element={<ComingNext name="PH Accessibility" />} />
          <Route path="recommender" element={<ComingNext name="Skill Gap Recommender" />} />
          <Route path="methodology" element={<ComingNext name="Methodology" />} />
          <Route path="*" element={<ComingNext name="Page not found" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
