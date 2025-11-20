// utils/Chatbot.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, MessageCircle, Sparkles } from 'lucide-react';
import logo from '../img/edu_logo.jpg';

export default function Chatbot() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [hasChosen, setHasChosen] = useState(false);
  const isExamPage = location.pathname === '/exam';
  const isDark = document.documentElement.classList.contains('dark');

  useEffect(() => {
    if (isExamPage) {
      setIsOpen(false);
      setShowWelcome(false);
      setHasChosen(true);
    }
  }, [isExamPage]);

  // Load Botpress only when chat opens
  useEffect(() => {
    if (!isOpen || isExamPage) return;

    const scriptId = 'botpress-webchat-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://cdn.botpress.cloud/webchat/v2.4/inject.js';
    script.async = true;
    script.onload = () => {
      window.botpress?.init({
        botId: '8f1fd171-6783-4645-a335-f92c6b1aafb8',
        clientId: '2ddf09b2-2eac-4542-add4-9fdd64391d83',
        selector: '#webchat',
        configuration: {
          color: '#6366f1',
          variant: 'soft',
          themeMode: isDark ? 'dark' : 'light',
          fontFamily: 'Inter, sans-serif',
          radius: 24,
          botName: 'Eduplanet CAT Assistant',
          avatarUrl: logo,
          botConversationDescription: 'Hi! I’m here to help you study smarter for your CAT exam.',
        },
      });
    };
    document.body.appendChild(script);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [isOpen, isExamPage, isDark]);

  const handleStudy = () => {
    setShowWelcome(false);
    setHasChosen(true);
    setIsOpen(true);
  };

  const handleExam = () => {
    setShowWelcome(false);
    setHasChosen(true);
    navigate('/exam');
  };

  const toggleChat = () => setIsOpen(prev => !prev);

  if (isExamPage || hasChosen && !isOpen) {
    return null;
  }

  return (
    <>
      {/* Welcome Modal (First Time Only) */}
      {showWelcome && !isExamPage && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10"></div>
            
            <button
              onClick={() => setShowWelcome(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={28} />
            </button>

            <img src={logo} alt="Eduplanet" className="w-20 h-20 mx-auto mb-6 rounded-full shadow-lg" />
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              Welcome to Eduplanet CAT
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Only <strong>Grade 12</strong> students can use Study Mode.<br />
              Review lessons, practice questions, and ace your exam!
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleStudy}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-8 rounded-2xl hover:scale-105 transform transition shadow-lg flex items-center gap-3"
              >
                <Sparkles size={20} />
                Study Mode
              </button>
              <button
                onClick={handleExam}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-8 rounded-2xl hover:scale-105 transform transition shadow-lg"
              >
                Start Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Modal */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Collapsed Dot */}
        {!isOpen && (
          <button
            onClick={toggleChat}
            className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transform transition-all duration-300 animate-pulse"
          >
            <MessageCircle size={32} className="text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"></span>
          </button>
        )}

        {/* Expanded Chat Modal */}
        {isOpen && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-96 h-[600px] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Eduplanet" className="w-10 h-10 rounded-full" />
                  <div>
                    <h3 className="font-bold text-lg">Eduplanet Assistant</h3>
                    <p className="text-xs opacity-90">Ready to help you study!</p>
                  </div>
                </div>
                <button
                  onClick={toggleChat}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Chat Container */}
              <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-800">
                <div id="webchat" className="h-full rounded-2xl overflow-hidden shadow-inner" />
              </div>

              {/* Footer Hint */}
              <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400 border-t dark:border-gray-700">
                Click outside or press X to minimize
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}