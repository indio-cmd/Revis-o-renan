import { Route, Routes } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import Header from './components/Header'
import Footer from './components/Footer'
import Users from './pages/Users'
import PrivateRoute from './routes/PrivateRoute'

function App() {
 return (
   <>
    <Header />
    <Routes>
      <Route path='/' element={<Login />} />
      
      <Route element={<PrivateRoute/>}> 
        <Route path='/users' element={<Users/>} />
      </Route>
      
    </Routes>
    <Footer />
  </>
 )
}

export default App
