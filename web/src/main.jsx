import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Skills from './pages/Skills'
import Salary from './pages/Salary'
import Access from './pages/Access'
import Recommender from './pages/Recommender'
import Methodology from './pages/Methodology'
import ComingNext from './pages/ComingNext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="skills" element={<Skills />} />
          <Route path="salary" element={<Salary />} />
          <Route path="access" element={<Access />} />
          <Route path="recommender" element={<Recommender />} />
          <Route path="methodology" element={<Methodology />} />
          <Route path="*" element={<ComingNext name="Page not found" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
