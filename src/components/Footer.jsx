// import logo from "../Images/logo2.jpg";
import {
  FiMail,  FiYoutube,
} from "react-icons/fi";
import { BsGooglePlay } from "react-icons/bs";

const Footer = () => {
  return (
    <div className="py-10 px-5 md:px-10 lg:px-28 bg-[#383638] ">
        <h1 className="text-white">Follow me on YouTube:</h1>
      <div className=" mt-5 flex gap-2 justify-center">
        <span className="flex justify-center hover:text-red-500 items-center bg-white rounded-full text-red w-8 h-8 text-xl cursor-pointer">
          <FiYoutube />
        </span>
        
        <span className="flex justify-center hover:text-blue-500 items-center bg-white rounded-full text-black w-8 h-8 text-xl cursor-pointer">
          <FiMail />
        </span>

        <span className="flex justify-center hover:text-red-500 items-center bg-white rounded-full text-black w-8 h-8 text-xl cursor-pointer">
          <BsGooglePlay/>
        </span>
       
      </div>

      <p className="border-t-2 py-5 mt-5 text-sm text-center text-white ">
        Copyright @ 2023 Travis Logic. All Right Reserved
      </p>
    </div>
  );
};

export default Footer;

