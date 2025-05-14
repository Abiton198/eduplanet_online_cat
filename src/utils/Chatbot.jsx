// utils/Chatbot.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Chatbot() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [showPopup, setShowPopup] = useState(true);

  const isExamPage = location.pathname === '/exam';

  useEffect(() => {
    if (isExamPage) {
      setShowChat(false);
      setShowPopup(false);
      const webchatEl = document.getElementById('webchat');
      if (webchatEl) {
        webchatEl.innerHTML = '';
      }
    }
  }, [isExamPage]);

  useEffect(() => {
    if (!showChat || isExamPage) return;

    const existingScript = document.getElementById('botpress-script');
    if (existingScript) return;

    const script = document.createElement('script');
    script.id = 'botpress-script';
    script.src = 'https://cdn.botpress.cloud/webchat/v2.4/inject.js';
    script.onload = () => {
      window.botpress.on('webchat:ready', () => {
        window.botpress.open();
      });

      window.botpress.init({
        botId: '8f1fd171-6783-4645-a335-f92c6b1aafb8',
        clientId: '2ddf09b2-2eac-4542-add4-9fdd64391d83',
        selector: '#webchat',
        configuration: {
          color: '#5eb1ef',
          variant: 'soft',
          themeMode: 'light',
          fontFamily: 'inter',
          radius: 1,
          botName: 'Eduplanet CAT Assistant',
          avatarUrl: 'https://botpress.com/favicon.ico',
          botConversationDescription: 'Welcome to Eduplanet School CAT Online. Setting you for success through study.',
        },
      });
    };

    document.body.appendChild(script);
  }, [showChat, isExamPage]);

  const handleStudy = () => {
    setShowPopup(false);
    setShowChat(true);
  };

  const handleExit = () => {
    setShowPopup(false);
    setShowChat(false);
    navigate('/exam');
  };

  return (
    <div>
      {showPopup && !isExamPage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '500px',
              textAlign: 'center',
              boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a202c', marginBottom: '1rem' }}>
              Welcome to Eduplanet School CAT Online
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#4a5568' }}>
              "Success is calling — and it says you're awesome! Review the week's lessons, then show that exam who's the boss."
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                onClick={handleStudy}
                style={{
                  backgroundColor: '#38a169',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Study
              </button>
              <button
                onClick={handleExit}
                style={{
                  backgroundColor: '#e53e3e',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {!isExamPage && showChat && (
        <div
          id="webchat"
          style={{
            width: '360px',
            height: '520px',
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => setShowChat(false)}
            style={{
              position: 'absolute',
              top: '5px',
              right: '10px',
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#999',
              zIndex: 10000,
            }}
            aria-label="Close Chat"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
