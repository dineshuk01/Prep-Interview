import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, User, Bot, Clock, Briefcase, Code, Users, Settings, Plus } from 'lucide-react';

const InterviewCard = ({ type, onClick, cardStyles }) => {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = type.icon;
  const cardStyle = cardStyles[type.cardColor];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...cardStyle.card,
        ...(isHovered ? cardStyle.cardHover : {}),
        borderRadius: '1rem',
        padding: '2rem',
        textAlign: 'center',
        cursor: 'pointer'
      }}
    >
      {/* Icon */}
      <div style={{
        ...cardStyle.icon,
        width: '4rem',
        height: '4rem',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
        color: 'white'
      }}>
        <IconComponent size={32} />
      </div>

      {/* Content */}
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '1rem'
      }}>
        {type.title}
      </h3>

      <p style={{
        color: '#6b7280',
        lineHeight: '1.6',
        marginBottom: '1.5rem'
      }}>
        {type.description}
      </p>

      {/* Button */}
      <div style={{
        display: 'inline-block',
        background: 'white',
        padding: '0.75rem 1.5rem',
        borderRadius: '2rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#374151',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        Start Interview →
      </div>
    </div>
  );
};

const InterviewApp = () => {
  const [currentView, setCurrentView] = useState('home');
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState({});
  const [userId] = useState(() => {
    let id = localStorage.getItem('chat_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('chat_user_id', id);
    }
    return id;
  });
  const [sessionId, setSessionId] = useState(() => {
    let id = localStorage.getItem('chat_session_id');
    if (!id) {
      id = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('chat_session_id', id);
    }
    return id;
  });
  const [sessionsList, setSessionsList] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  const interviewTypes = [
    { id: 'technical', title: 'Technical Round', description: 'Coding problems, algorithms, and technical concepts', icon: Code, iconColor: 'blue', cardColor: 'blue' },
    { id: 'hr', title: 'HR Round', description: 'Behavioral questions and cultural fit assessment', icon: Users, iconColor: 'green', cardColor: 'green' },
    { id: 'system-design', title: 'System Design Round', description: 'Architecture design and scalability discussions', icon: Settings, iconColor: 'orange', cardColor: 'orange' },
    { id: 'case-study', title: 'Case Study Round', description: 'Business problem solving and analytical thinking', icon: Briefcase, iconColor: 'purple', cardColor: 'purple' }
  ];

  const cardStyles = {
    blue: { card: { background: 'linear-gradient(135deg, #dbeafe 0%, #f3f4f6 100%)', border: '1px solid #e5e7eb', transition: 'all 0.3s ease' }, cardHover: { background: 'linear-gradient(135deg, #bfdbfe 0%, #e5e7eb 100%)', transform: 'translateY(-4px) scale(1.02)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }, icon: { background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' } },
    green: { card: { background: 'linear-gradient(135deg, #d1fae5 0%, #f3f4f6 100%)', border: '1px solid #e5e7eb', transition: 'all 0.3s ease' }, cardHover: { background: 'linear-gradient(135deg, #a7f3d0 0%, #e5e7eb 100%)', transform: 'translateY(-4px) scale(1.02)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }, icon: { background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' } },
    orange: { card: { background: 'linear-gradient(135deg, #fed7aa 0%, #f3f4f6 100%)', border: '1px solid #e5e7eb', transition: 'all 0.3s ease' }, cardHover: { background: 'linear-gradient(135deg, #fdba74 0%, #e5e7eb 100%)', transform: 'translateY(-4px) scale(1.02)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }, icon: { background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' } },
    purple: { card: { background: 'linear-gradient(135deg, #e9d5ff 0%, #f3f4f6 100%)', border: '1px solid #e5e7eb', transition: 'all 0.3s ease' }, cardHover: { background: 'linear-gradient(135deg, #ddd6fe 0%, #e5e7eb 100%)', transform: 'translateY(-4px) scale(1.02)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }, icon: { background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' } }
  };

  // Speech recognition setup
  useEffect(() => {
    let recognitionInstance = null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        setCurrentMessage(finalTranscript + interimTranscript);
      };

      recognitionInstance.onstart = () => setIsRecording(true);
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        if (event.error === 'not-allowed') {
          alert("Microphone access is blocked! Please click the microphone/lock icon in your browser's address bar and select 'Allow' to use voice typing.");
        } else if (event.error === 'no-speech') {
          // No speech detected, ignore this warning safely
        } else if (event.error === 'network') {
          alert("Speech recognition network error! Please check your internet connection.");
        } else {
          alert(`Speech recognition error: ${event.error}. Please try again.`);
        }
      };
      recognitionInstance.onend = () => setIsRecording(false);
      
      setRecognition(recognitionInstance);
    }

    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const fetchSessionsList = async () => {
    try {
      const response = await fetch(`http://localhost:8000/sessions/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionsList(data.sessions);
      }
    } catch (err) {
      console.error("Failed to fetch sessions list:", err);
    }
  };

  useEffect(() => {
    fetchSessionsList();
  }, [userId]);

  // Stop recording when view changes (e.g., navigating back to home or another round)
  useEffect(() => {
    if (isRecording && recognition) {
      try {
        recognition.stop();
      } catch (e) {
        console.error('Error stopping speech recognition on view change:', e);
      }
      setIsRecording(false);
    }

    if (currentView !== 'home') {
      const fetchHistory = async () => {
        try {
          const response = await fetch(`http://localhost:8000/history/${sessionId}/${currentView}`);
          if (response.ok) {
            const data = await response.json();
            setMessages(prev => ({ ...prev, [currentView]: data.messages }));
          }
        } catch (err) {
          console.error("Failed to fetch history:", err);
        }
      };
      fetchHistory();
    }
  }, [currentView, recognition, sessionId, isRecording]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startRecording = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please use a modern browser like Google Chrome, Microsoft Edge, or Apple Safari.");
      return;
    }
    try {
      recognition.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Speech recognition start error:', e);
    }
  };

  const stopRecording = () => {
    if (!recognition) return;
    try {
      recognition.stop();
      setIsRecording(false);
    } catch (e) {
      console.error('Speech recognition stop error:', e);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;
    const userMessage = currentMessage.trim();
    const roundMessages = messages[currentView] || [];

    setMessages(prev => ({
      ...prev,
      [currentView]: [...roundMessages, { type: 'user', content: userMessage, timestamp: new Date() }]
    }));
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, round_type: currentView, session_id: sessionId, user_id: userId })
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      setMessages(prev => ({
        ...prev,
        [currentView]: [
          ...(prev[currentView] || []),
          { type: 'bot', content: data.response, timestamp: new Date(), audioUrl: data.audio_url }
        ]
      }));

      if (data.audio_url && audioRef.current) {
        audioRef.current.src = `http://localhost:8000${data.audio_url}`;
        audioRef.current.play().catch(console.error);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => ({
        ...prev,
        [currentView]: [
          ...(prev[currentView] || []),
          { type: 'bot', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }
        ]
      }));
    } finally {
      setIsLoading(false);
      fetchSessionsList(); // Update sidebar with new session title/time
    }
  };

  const clearHistory = async () => {
    try {
      await fetch('http://localhost:8000/clear-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, round_type: currentView })
      });
      setMessages(prev => ({ ...prev, [currentView]: [] }));
      fetchSessionsList(); // Update sidebar
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const playAudio = (audioUrl) => {
    if (audioRef.current) {
      audioRef.current.src = `http://localhost:8000${audioUrl}`;
      audioRef.current.play().catch(console.error);
    }
  };

  const formatTime = (date) => {
    try {
      const d = new Date(date);
      return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(d);
    } catch (e) {
      return '';
    }
  };

  const handleNewSession = () => {
    const id = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('chat_session_id', id);
    setSessionId(id);
    setCurrentView('home');
  };

  const handleLoadSession = (session) => {
    localStorage.setItem('chat_session_id', session.session_id);
    setSessionId(session.session_id);
    setCurrentView(session.round_type);
  };

  const renderSidebar = () => (
    <div style={{ width: '260px', background: '#1f2937', color: 'white', display: 'flex', flexDirection: 'column', height: '100vh', padding: '1.5rem 1rem', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', padding: '0 0.5rem' }}>
        <Bot size={24} color="#60a5fa" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>AI Interview</h2>
      </div>
      
      <button 
        onClick={handleNewSession}
        style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', transition: 'background 0.2s' }}
        onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
        onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
      >
        <Plus size={18} />
        New Interview
      </button>
      
      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#9ca3af', marginBottom: '0.75rem', textTransform: 'uppercase', padding: '0 0.5rem' }}>
        Previous Sessions
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', flex: 1 }}>
        {sessionsList.map(session => (
          <div 
            key={`${session.session_id}-${session.round_type}`} 
            onClick={() => handleLoadSession(session)}
            style={{ 
              padding: '0.75rem', 
              background: (sessionId === session.session_id && currentView !== 'home') ? '#374151' : 'transparent', 
              borderRadius: '0.5rem', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
            onMouseOver={(e) => { if (sessionId !== session.session_id || currentView === 'home') e.currentTarget.style.background = '#374151'; }}
            onMouseOut={(e) => { if (sessionId !== session.session_id || currentView === 'home') e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ fontWeight: '500', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: (sessionId === session.session_id && currentView !== 'home') ? 'white' : '#d1d5db' }}>
              {session.title}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
              <span>{session.round_type.replace('-', ' ')}</span>
            </div>
          </div>
        ))}
        {sessionsList.length === 0 && (
          <div style={{ fontSize: '0.875rem', color: '#6b7280', padding: '0 0.5rem', marginTop: '0.5rem' }}>
            No previous sessions
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    if (currentView === 'home') {
      return (
        <div style={{ flex: 1, minHeight: '100vh', overflowY: 'auto', background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)', padding: '2rem 1rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
                AI Interview Platform
              </h1>
              <p style={{ fontSize: '1.25rem', color: '#6b7280', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                Practice your interview skills with AI-powered mock interviews across different rounds
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
              {interviewTypes.map((type) => (
                <InterviewCard key={type.id} type={type} onClick={() => setCurrentView(type.id)} cardStyles={cardStyles} />
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Interview chat view
    const currentType = interviewTypes.find(type => type.id === currentView);
    const currentMessages = messages[currentView] || [];

    return (
      <div style={{ flex: 1, height: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottom: '1px solid #e5e7eb', padding: '1rem 1.5rem', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={() => setCurrentView('home')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '1rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem' }} onMouseOver={(e) => e.target.style.color = '#1f2937'} onMouseOut={(e) => e.target.style.color = '#6b7280'}>
                ← Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {currentType && <currentType.icon size={24} color="#374151" />}
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                  {currentType?.title}
                </h1>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              <button onClick={clearHistory} style={{ background: 'white', border: '1px solid #e5e7eb', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }} onMouseOver={(e) => { e.target.style.background = '#fef2f2'; e.target.style.borderColor = '#fca5a5'; }} onMouseOut={(e) => { e.target.style.background = 'white'; e.target.style.borderColor = '#e5e7eb'; }}>
                Reset Session
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} />
                <span>Live Session</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '900px', margin: '0 auto', width: '100%', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {currentMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <Bot size={64} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.5rem' }}>
                  Ready to start your {currentType?.title.toLowerCase()}?
                </h3>
                <p style={{ color: '#6b7280' }}>Ask me anything or introduce yourself to begin!</p>
              </div>
            )}

            {currentMessages.map((message, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexDirection: message.type === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: message.type === 'user' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : '#374151', flexShrink: 0 }}>
                  {message.type === 'user' ? <User size={20} color="white" /> : <Bot size={20} color="white" />}
                </div>
                <div style={{ flex: 1, maxWidth: '600px', textAlign: message.type === 'user' ? 'right' : 'left' }}>
                  <div style={{ maxWidth: '70%', padding: '0.75rem 1rem', borderRadius: '1rem', marginBottom: '0.5rem', ...(message.type === 'user' ? { background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white', marginLeft: 'auto' } : { background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }) }}>
                    <p style={{ fontSize: '0.875rem', lineHeight: '1.5', margin: 0 }}>
                      {message.content}
                    </p>
                    {message.audioUrl && (
                      <button onClick={() => playAudio(message.audioUrl)} style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }} onMouseOver={(e) => e.target.style.color = '#374151'} onMouseOut={(e) => e.target.style.color = '#6b7280'}>
                        <Volume2 size={12} />
                        <span>Play Audio</span>
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#9ca3af', textAlign: message.type === 'user' ? 'right' : 'left' }}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={20} color="white" />
                </div>
                <div style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '1rem', padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#9ca3af', animation: 'bounce 1.4s ease-in-out infinite both' }}></div>
                    <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#9ca3af', animation: 'bounce 1.4s ease-in-out infinite both', animationDelay: '0.16s' }}></div>
                    <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#9ca3af', animation: 'bounce 1.4s ease-in-out infinite both', animationDelay: '0.32s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ flexShrink: 0, background: 'white', borderTop: '1px solid #e5e7eb', padding: '1rem 1.5rem', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'end', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Type your message or use voice input..."
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '1rem', resize: 'none', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none' }}
                  rows="2"
                  disabled={isLoading}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
              
              <button onClick={isRecording ? stopRecording : startRecording} style={{ background: isRecording ? '#ef4444' : '#f3f4f6', color: isRecording ? 'white' : '#374151', border: isRecording ? '1px solid #ef4444' : '1px solid #d1d5db', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', opacity: isRecording ? '0.8' : '1' }} disabled={isLoading}>
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <button onClick={sendMessage} style={{ background: !currentMessage.trim() || isLoading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: !currentMessage.trim() || isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }} disabled={!currentMessage.trim() || isLoading}>
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Hidden audio element for TTS playback */}
        <audio ref={audioRef} />
        
        {/* Add keyframe animations via style tag */}
        <style jsx>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); } 
            40% { transform: scale(1); }
          }
        `}</style>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {renderSidebar()}
      {renderContent()}
    </div>
  );
};

export default InterviewApp;