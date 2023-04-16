// import './App.css'
import { Route,Routes } from 'react-router-dom'
import { About, Contact,Header,Main, Navbar,Skills, Projects, Footer } from './components'

function App() {
 

  return (
    <div className="dark:bg[#0d0d0d] dark:text-[#f5f5f5] bg-slate-300  text-black font-Nunito"  >
      
             <Navbar/>
            
            
         
         

         <Routes>
           <Route exact path='/' element={<Main/>}/> 
           <Route path='/AboutMe'  element={<About/>}/>
           <Route path='/Skills'  element={<Skills/>}/>
           <Route path='/Projects' element={<Projects/>}/> 
         
         </Routes> 
         <Footer/>
    </div>
  )
}

export default App
