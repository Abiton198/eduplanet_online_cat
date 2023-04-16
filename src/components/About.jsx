import React from 'react'

function About() {
  return (
    <div>
        <div className="flex flex-col md:flex-row md:items-center md:gap-20">
                <div  className='flex-1'>
                    <h2 className="text-center md:block text-2xl font-bold mb-5">Software Development</h2>
                    <p className="text-[15px] text-zinc-800 dark:text-gray-300 mb-5 text-justify md:text-center ">
                        I love to code, and I'm always learning new programming languages and techniques. On my 
                        website, you can find examples of my coding projects, as well as tutorials and articles about
                        software development. Whether you're a beginner or an experienced coder, I hope you'll find 
                        something here that inspires you.
                    </p>
                </div>
            </div>
           
            <div className="flex flex-col md:flex-row md:items-center md:gap-20">
                <div  className='flex-1'>               
                    <h1 className="text-center md:block  text-2xl font-bold mb-5"> Game Development</h1>
                    <p className="text-[15px] text-zinc-800 dark:text-gray-300 mb-5 text-justify md:text-center">

                        I'm also a huge fan of game development. I love creating games that are not only fun to play but 
                        also challenging and educational. On my website, you can find examples of my game development 
                        projects, as well as tutorials and articles about game design and development. Whether you're 
                        interested in creating your own games or just enjoy playing them, I hope you'll find something
                        here that you love.
                </p>
                </div>
            </div>
            

          
    </div>
  )
}

export default About