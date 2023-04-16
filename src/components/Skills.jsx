import React from 'react'
import javascript_logo from '../Images/javascript.png'
import machine_logo from '../Images/machine.jpeg'
import python_logo from '../Images/python.jpeg'
import scratch_logo from '../Images/scratch.png'
import thunkable_logo from '../Images/thunkable.png'

function Skills() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 justify">
   
            <div className="w-60 h-64 flex mb-10 md:mb-0 flex-col justify-evenly items-center border-[1px] rounded-3xl py-8 md:w-48 md:h-48 lg:w-60 hover:scale-105 transition-all duration-200 shadow dark:bg-zinc-900">
                <img className="" src={javascript_logo}/>
            </div>

            <div className="w-60 h-64 flex mb-10 md:mb-0 flex-col justify-evenly items-center border-[1px] rounded-3xl py-8 md:w-48 md:h-48 lg:w-60 hover:scale-105 transition-all duration-200 shadow dark:bg-zinc-900">
                <img className="" src={machine_logo}/>
            </div>

            <div className="w-60 h-64 flex mb-10 md:mb-0 flex-col justify-evenly items-center border-[1px] rounded-3xl py-8 md:w-48 md:h-48 lg:w-60 hover:scale-105 transition-all duration-200 shadow dark:bg-zinc-900">
                <img className="" src={python_logo}/>
            </div>

            <div className="w-60 h-64 flex mb-10 md:mb-0 flex-col justify-evenly items-center border-[1px] rounded-3xl py-8 md:w-48 md:h-48 lg:w-60 hover:scale-105 transition-all duration-200 shadow dark:bg-zinc-900">
                <img className="" src={scratch_logo}/>
            </div>

            <div className="w-60 h-64 flex mb-10 md:mb-0 flex-col justify-evenly items-center border-[1px] rounded-3xl py-8 md:w-48 md:h-48 lg:w-60 hover:scale-105 transition-all duration-200 shadow dark:bg-zinc-900">
                <img className="" src={thunkable_logo}/>
            </div>

    </div>
  )
}

export default Skills