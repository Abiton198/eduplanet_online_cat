import React from 'react'
import travis_home from '../Images/travis_home.jpg'

function Main() {
  return (
    <div className="pt-3  md:px-10 lg:px-28 text-justify justify-center text-white">

        <div className="flex flex-col md:flex-row md:items-center md:gap-20">
           <div className='flex-1'>
                <h2 className="text-center md:block  text-2xl font-bold mb-5">Hi & Welcome!</h2>
                <p className="text-[15px]  text-white mb-5 text-justify md:text-center m-2">
                    My name is <span className='italic font-bold'>Travis</span> . I'm a 13-year-old software developer with a passion for coding. On this website, you can 
                    find out more about my projects, skills, and experience.</p>
           </div>
        </div>

<div className="flex items-center my-5 gap-5">
        <div className=" flex mb-10 mr-10 md:mb-0 m-2 flex-col justify-evenly items-center border-[1px] rounded-3xl py-8 md:w-48 md:h-48 lg:w-60 hover:scale-105 transition-all duration-200 shadow dark:bg-zinc-900">
            <img className="" src={travis_home}/>
        </div>

        <div >
            <p className="text-xl text-blue-600 m-2 dark:text-gray-200 animate-bounce ml-5 pl-5">The future is logical and needs the logical mindset now!</p>
        </div>

</div>
            
            </div>
  )
}

export default Main