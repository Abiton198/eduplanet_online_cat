// utils/Chatbot.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, MessageCircle, Sparkles } from 'lucide-react';
import logo from '../img/edu_logo.jpg';

export default function Chatbot({ studentInfo }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide chatbot completely on exam page
  const isExamPage = location.pathname === '/exam';

  const [isOpen, setIsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  /* ======================================================
     DERIVED / MEMOIZED VALUES
     ====================================================== */

  // First name only (safe fallback)
  const studentName = useMemo(
    () => studentInfo?.name?.split(' ')[0] || 'Student',
    [studentInfo]
  );

  // Used for conditional messaging
  const isGrade12 = useMemo(
    () => studentInfo?.grade?.toLowerCase().includes('12'),
    [studentInfo]
  );

  /* ======================================================
     AUTO-OPEN CHAT ONCE PER SESSION
     ====================================================== */
  useEffect(() => {
    if (isExamPage) return;

    const seen = sessionStorage.getItem('chat-welcome');
    if (!seen) {
      const timer = setTimeout(() => setIsOpen(true), 900);
      sessionStorage.setItem('chat-welcome', 'true');
      return () => clearTimeout(timer);
    }
  }, [isExamPage]);

  /* ======================================================
     FORCE CLOSE ON EXAM PAGE
     ====================================================== */
  useEffect(() => {
    if (isExamPage) {
      setIsOpen(false);
      setShowWelcome(false);
    }
  }, [isExamPage]);

  /* ======================================================
     FOCUS CHAT INPUT (CRITICAL UX FEATURE)
     - Waits until Botpress input exists
     - Works on first open and reopen
     ====================================================== */
  const focusChatInput = useCallback(() => {
    const interval = setInterval(() => {
      const input =
        document.querySelector('textarea[placeholder]') ||
        document.querySelector('input[type="text"]');

      if (input) {
        input.focus();
        clearInterval(interval);
      }
    }, 150);

    // Safety timeout (prevents infinite loop)
    setTimeout(() => clearInterval(interval), 3000);
  }, []);

  /* ======================================================
     INITIALIZE BOTPRESS (SAFE & REUSABLE)
     ====================================================== */
  const initializeBotpress = useCallback(() => {
    if (!window.botpressWebChat) {
      setTimeout(initializeBotpress, 300);
      return;
    }

    // Reset container to avoid duplicates
    const container = document.getElementById('webchat');
    if (container) container.innerHTML = '';

    window.botpressWebChat.init({
      botId: '8f1fd171-6783-4645-a335-f92c6b1aafb8',
      clientId: '2ddf09b2-2eac-4542-add4-9fdd64391d83',
      hostUrl: 'https://cdn.botpress.cloud/webchat/v2',
      messagingUrl: 'https://messaging.botpress.cloud',
      selector: '#webchat',
      configuration: {
        botName: 'CAT Study Guru',
        avatarUrl: logo,
        composerPlaceholder: `Hi ${studentName}, ask me anything!`,
        botConversationDescription: `Hey ${studentName}! Let's get you exam-ready.`,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        color: '#8b5cf6',
        fontFamily: 'inter',
        radius: 4,
      },
    });

    // Show chat + greet user + focus input
    setTimeout(() => {
      window.botpressWebChat.sendEvent({ type: 'show' });

      window.botpressWebChat.sendEvent({
        type: 'trigger',
        payload: { type: 'text', text: `Hi ${studentName}! Ready to study?` },
      });

      focusChatInput();
    }, 600);
  }, [studentName, focusChatInput]);

  /* ======================================================
     LOAD BOTPRESS SCRIPTS ONLY ON DEMAND
     ====================================================== */
  const loadBotpressScripts = useCallback(() => {
  if (window.__BOTPRESS_LOADED__) {
    initializeBotpress();
    return;
  }

  const inject = document.createElement('script');
  inject.src = 'https://cdn.botpress.cloud/webchat/v2/inject.js';
  inject.async = true;

  inject.onload = () => {
    window.__BOTPRESS_LOADED__ = true;
    initializeBotpress();
  };

  inject.onerror = () => {
    console.error('Botpress inject.js failed to load');
  };

  document.body.appendChild(inject);
}, [initializeBotpress]);

  /* ======================================================
     LOAD CHAT ONLY WHEN OPEN
     ====================================================== */
  useEffect(() => {
    if (isOpen && !isExamPage) {
      loadBotpressScripts();
    }
  }, [isOpen, isExamPage, loadBotpressScripts]);

  /* ======================================================
     BUTTON ACTIONS
     ====================================================== */
  const startChat = () => {
    setShowWelcome(false);
    setIsOpen(true);
    setTimeout(focusChatInput, 800);
  };

  const goToExam = () => {
    setShowWelcome(false);
    navigate('/exam');
  };

  if (isExamPage) return null;

  /* ======================================================
     RENDER
     ====================================================== */
  return (
    <>
      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl flex items-center justify-center z-50 p-6">
          <div className="relative max-w-2xl w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl blur-3xl opacity-60 animate-pulse"></div>

            <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-3xl overflow-hidden border border-white/30">
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-10 text-white text-center">
                <img src={logo} alt="Eduplanet" className="w-28 h-28 mx-auto rounded-full border-4 border-white shadow-2xl mb-4" />
                <h1 className="text-5xl font-extrabold mb-3">Hey {studentName}!</h1>
                <p className="text-2xl">Your CAT Study Guru is ready!</p>
              </div>

              <div className="p-10 text-center space-y-8">
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  {isGrade12 ? 'Grade 12 Study Mode Unlocked!' : 'Get exam-ready with instant help!'}
                </p>

                <div className="flex gap-4 justify-center">
                  {isGrade12 && (
                    <button
                      onClick={startChat}
                      className="px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xl rounded-2xl hover:scale-110 transition-all shadow-2xl flex items-center gap-3"
                    >
                      <Sparkles className="animate-spin" /> Let's Study!
                    </button>
                  )}

                  <button
                    onClick={goToExam}
                    className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xl rounded-2xl hover:scale-110 transition-all shadow-2xl"
                  >
                    Take Exam
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowWelcome(false)}
                className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-full p-3 transition"
              >
                <X size={32} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Button / Window */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* {isOpen && (
          <div className="mb-4 mr-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-3xl w-96 h-[620px] flex flex-col overflow-hidden border border-gray-300 dark:border-gray-700">
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Eduplanet" className="w-12 h-12 rounded-full ring-4 ring-white/30" />
                  <div>
                    <h3 className="font-bold text-lg">CAT Study Guru</h3>
                    <p className="text-xs opacity-90">Ask me anything!</p>
                  </div>
                </div>

                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded-full p-2">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-4">
                <div id="webchat" className="h-full rounded-3xl overflow-hidden border-4 border-gray-200 dark:border-gray-700" />
              </div>
            </div>
          </div>
        )} */}

        {/* {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              setTimeout(focusChatInput, 800);
            }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full p-4 shadow-xl hover:scale-105 transition"
          >
            <MessageCircle size={24} />
          </button>
        )} */}
      </div>
    </>
  );
}

// Chatbot not working - not loading from the chatbot press