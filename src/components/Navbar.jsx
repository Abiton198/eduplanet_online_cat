import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logo from "../Images/logo.jpg";
import logo2 from "../Images/logo2.jpg";
import { FiMenu } from "react-icons/fi";
import { AiOutlineClose } from "react-icons/ai";
import { BsSunFill, BsMoonFill } from "react-icons/bs";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState("");

  const element = document.documentElement;
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  function onWindowMatch() {
    if (
      localStorage.isActive === "dark" ||
      (!("isActive" in localStorage) && darkQuery.matches)
    ) {
      element.classList.add("dark");
    } else {
      element.classList.remove("dark");
    }
  }

  onWindowMatch();

  useEffect(() => {
    switch (isActive) {
      case "moon":
        element.classList.add("dark");
        localStorage.setItem("isActive", "dark");
        break;
      case "sun":
        element.classList.remove("dark");
        localStorage.setItem("isActive", "light");
        break;
      default:
        localStorage.removeItem("isActive");
        break;
    }
  }, [isActive]);
  return (
    <>
      <nav className="flex justify-between items-center px-5 md:px-10 lg:px-28 dark:bg-[#0D0D0D] dark:text-white">
        <div className="cursor-pointer">
          {isActive === "sun" ? <img src={logo2} className="w-10 h-10 rounded-full transform hover:scale-150 transition-transform"/> : <img src={logo} className="w-10 h-10 rounded-full transform hover:scale-200 transition-transform"/>}
        </div>
        <div className="flex justify-between items-center gap-3">
          {/* hamburger for navbar */}
          <div className="container gap-6 flex items-center justify-between px-4 py-5">
            <div className="hidden space-x-10 md:flex items-center text-sm">
              <Link
                to="/"
                className="hover:text-blue-600 border-b-2 dark:border-b-[#0d0d0d] dark:hover:border-blue-600 border-b-white py-2 hover:border-b-blue-600 transition-all duration-200"
              >
                Home
              </Link>
              <Link
                to="/Contact"
                className="hover:text-blue-600 border-b-2 dark:border-b-[#0d0d0d] dark:hover:border-blue-600 border-b-white py-2 hover:border-b-blue-600 transition-all duration-200"
              >
                Contact
              </Link>
    
              <Link
                to="/Skills"
                className="hover:text-blue-600 border-b-2 dark:border-b-[#0d0d0d] dark:hover:border-blue-600 border-b-white py-2 hover:border-b-blue-600 transition-all duration-200"
              >
                Skills
              </Link>

              <Link
                to="/Projects"
                className="hover:text-blue-600 border-b-2 dark:border-b-[#0d0d0d] dark:hover:border-blue-600 border-b-white py-2 hover:border-b-blue-600 transition-all duration-200"
              >
                Projects
              </Link>
              
            </div>
            <div className="flex gap-5 bg-blue-300 border-2 border-blue-400 dark:border-gray-500 dark:bg-zinc-800 px-3 py-2 rounded-full text-white">
              <span
                className={`cursor-pointer ${
                  isActive === "sun" && "text-blue-600"
                }`}
                title="light mode"
                onClick={() => setIsActive("sun")}
              >
                <BsSunFill />
              </span>
              <span
                className={`cursor-pointer ${
                  isActive === "moon" && "text-blue-600"
                }`}
                title="dark mode"
                onClick={() => setIsActive("moon")}
              >
                <BsMoonFill />
              </span>
            </div>

            <div
              onClick={handleClick}
              className="md:hidden transition duration-200 cursor-pointer"
            >
              {!isOpen ? (
                <FiMenu className="text-3xl" />
              ) : (
                <AiOutlineClose className="text-3xl" />
              )}
            </div>
          </div>
        </div>
        <small className="hidden md:flex bg-gray-100 dark:bg-black border-[2px] border-blue-600 dark:border-gray-300 text-blue-600 dark:text-gray-300 rounded-3xl font-bold px-5 py-2 justify-center hover:bg-blue-600 dark:hover:bg-gray-300 hover:text-white dark:hover:text-black cursor-pointer transition duration-200">
          Contact me
        </small>
      </nav>
      <div
        className={`${
          !isOpen ? "hidden" : "flex py-5"
        } flex-col gap-5 transition-all duration-200 px-8 shadow shadow-gray-700 dark:bg-[#0d0d0d] rounded-b`}
      >
        <Link to="/">
          <p className="hover:border-b-0 hover:border-l-2 border-blue-300 hover:pl-2 transition-all duration-200">
            Home
          </p>
        </Link>
        <Link to="/About">
          <p className="hover:border-l-2 border-blue-300 hover:pl-2 transition-all duration-200">
            About
          </p>
        </Link>
        <Link to="/Skills">
          <p className="hover:border-l-2 border-blue-300 hover:pl-2 transition-all duration-200">
            SKills
          </p>
        </Link>
        <Link to="/Projects">
          <p className="hover:border-l-2 border-blue-300 hover:pl-2 transition-all duration-200">
            Projects
          </p>
        </Link>
      </div>
    </>
  );
};

export default Navbar;



