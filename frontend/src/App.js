import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Send, Volume2, User, Bot, Clock, Briefcase, Code, Users, Settings, Plus, Sun, Moon, LogOut, Eye, EyeOff } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
        color: 'var(--text-main)',
        marginBottom: '1rem'
      }}>
        {type.title}
      </h3>

      <p style={{
        color: 'var(--text-muted)',
        lineHeight: '1.6',
        marginBottom: '1.5rem'
      }}>
        {type.description}
      </p>

      {/* Button */}
      <div style={{
        display: 'inline-block',
        background: isHovered ? cardStyle.button.background : 'white',
        padding: '0.75rem 1.5rem',
        borderRadius: '2rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: isHovered ? cardStyle.button.color : '#4b5563',
        boxShadow: isHovered ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
        border: `1px solid ${isHovered ? cardStyle.button.borderColor : '#e5e7eb'}`,
        transition: 'all 0.3s ease'
      }}>
        Start Interview →
      </div>
    </div>
  );
};


const AuthView = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const endpoint = isLogin ? '/login' : '/signup';
      const payload = isLogin ? { email, password } : { name, email, password };
      
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');
      
      onLogin(data.user_id, data.name, data.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow: hidden; background: var(--bg-primary); color: var(--text-main); }
        
        :root {
          --bg-primary: #f8fafc;
          --bg-secondary: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          --bg-card: white;
          --bg-header: #ffffff;
          --bg-input: white;
          --bg-sidebar: #1f2937;
          --bg-sidebar-hover: #374151;
          --text-main: #1f2937;
          --text-muted: #6b7280;
          --text-light: #9ca3af;
          --border: #e2e8f0;
          --border-light: #e5e7eb;
          --shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          --msg-user-bg: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          --msg-bot-bg: white;
          --msg-bot-icon: #1e293b;
        }

        [data-theme='dark'] {
          --bg-primary: #0f172a;
          --bg-secondary: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          --bg-card: #1e293b;
          --bg-header: #1e293b;
          --bg-input: #1e293b;
          --bg-sidebar: #020617;
          --bg-sidebar-hover: #1e293b;
          --text-main: #f8fafc;
          --text-muted: #94a3b8;
          --text-light: #64748b;
          --border: #334155;
          --border-light: #475569;
          --shadow: 0 4px 6px -1px rgba(0,0,0,0.5);
          --msg-user-bg: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          --msg-bot-bg: #1e293b;
          --msg-bot-icon: #0f172a;
        }
      `}</style>
      <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', padding: '1rem', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.5rem', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Bot size={28} color="white" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
              {isLogin ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              {isLogin ? 'Sign in to access your interviews' : 'Sign up to start practicing'}
            </p>
          </div>
          
          {error && (
            <div style={{ background: '#fee2e2', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} placeholder="John Doe" />
              </div>
            )}
            
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} placeholder="you@example.com" />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.875rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', transition: 'background 0.2s', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
          
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', padding: '0.5rem' }}>
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const InterviewApp = () => {

  const [currentView, setCurrentView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState({});
  const [userId, setUserId] = useState(() => localStorage.getItem('chat_user_id'));
  const [userName, setUserName] = useState(() => localStorage.getItem('chat_user_name'));
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
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDarkMode]);


  const interviewTypes = [
    { id: 'technical', title: 'Technical Round', description: 'Coding problems, algorithms, and technical concepts', icon: Code, iconColor: 'blue', cardColor: 'blue' },
    { id: 'hr', title: 'HR Round', description: 'Behavioral questions and cultural fit assessment', icon: Users, iconColor: 'green', cardColor: 'green' },
    { id: 'system-design', title: 'System Design Round', description: 'Architecture design and scalability discussions', icon: Settings, iconColor: 'orange', cardColor: 'orange' },
    { id: 'case-study', title: 'Case Study Round', description: 'Business problem solving and analytical thinking', icon: Briefcase, iconColor: 'purple', cardColor: 'purple' }
  ];

  const cardStyles = {
    blue: { card: { background: 'var(--bg-card)', border: '1px solid #f3f4f6', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }, cardHover: { transform: 'translateY(-4px)', boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.15), 0 8px 10px -6px rgba(59, 130, 246, 0.1)', borderColor: '#bfdbfe' }, icon: { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.4)' }, button: { color: '#2563eb', background: '#eff6ff', borderColor: '#bfdbfe' } },
    green: { card: { background: 'var(--bg-card)', border: '1px solid #f3f4f6', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }, cardHover: { transform: 'translateY(-4px)', boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.15), 0 8px 10px -6px rgba(16, 185, 129, 0.1)', borderColor: '#a7f3d0' }, icon: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.4)' }, button: { color: '#059669', background: '#ecfdf5', borderColor: '#a7f3d0' } },
    orange: { card: { background: 'var(--bg-card)', border: '1px solid #f3f4f6', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }, cardHover: { transform: 'translateY(-4px)', boxShadow: '0 20px 25px -5px rgba(249, 115, 22, 0.15), 0 8px 10px -6px rgba(249, 115, 22, 0.1)', borderColor: '#fed7aa' }, icon: { background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 8px 16px -4px rgba(249, 115, 22, 0.4)' }, button: { color: '#ea580c', background: '#fff7ed', borderColor: '#fed7aa' } },
    purple: { card: { background: 'var(--bg-card)', border: '1px solid #f3f4f6', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }, cardHover: { transform: 'translateY(-4px)', boxShadow: '0 20px 25px -5px rgba(139, 92, 246, 0.15), 0 8px 10px -6px rgba(139, 92, 246, 0.1)', borderColor: '#e9d5ff' }, icon: { background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', boxShadow: '0 8px 16px -4px rgba(139, 92, 246, 0.4)' }, button: { color: '#7c3aed', background: '#faf5ff', borderColor: '#e9d5ff' } }
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

  const fetchSessionsList = useCallback(async () => {
    try {
      if (!userId) return;
      const response = await fetch(`${API_BASE_URL}/sessions/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionsList(data.sessions);
      }
    } catch (err) {
      console.error("Failed to fetch sessions list:", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchSessionsList();
  }, [fetchSessionsList]);

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
          if (!userId) return;
          const response = await fetch(`${API_BASE_URL}/history/${sessionId}/${currentView}/${userId}`);
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
  }, [currentView, recognition, sessionId, isRecording, userId]);

  useEffect(() => {
    if (messagesEndRef.current && messagesEndRef.current.parentElement) {
      const container = messagesEndRef.current.parentElement;
      container.scrollTop = container.scrollHeight;
    }
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
      const response = await fetch(`${API_BASE_URL}/chat`, {
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
        audioRef.current.src = `${API_BASE_URL}${data.audio_url}`;
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
      await fetch(`${API_BASE_URL}/clear-history`, {
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
      audioRef.current.src = `${API_BASE_URL}${audioUrl}`;
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


  const handleLogout = () => {
    localStorage.removeItem('chat_user_id');
    localStorage.removeItem('chat_user_name');
    localStorage.removeItem('chat_session_id');
    const newSessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('chat_session_id', newSessionId);
    setSessionId(newSessionId);
    setMessages({});
    setSessionsList([]);
    setUserId(null);
    setUserName(null);
    setCurrentView('home');
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
    <div style={{ width: '260px', background: 'var(--bg-sidebar)', color: 'white', display: 'flex', flexDirection: 'column', height: '100vh', padding: '1.5rem 1rem', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
        <Bot size={20} color="#60a5fa" />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>AI Interview</h2>
      </div>
      
      <button 
        onClick={handleNewSession}
        style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem', transition: 'background 0.2s' }}
        onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
        onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
      >
        <Plus size={18} />
        New Interview
      </button>
      
      <div style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-light)', marginBottom: '0.5rem', textTransform: 'uppercase', padding: '0 0.5rem' }}>
        Previous Sessions
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', flex: 1 }}>
        {sessionsList.map(session => (
          <div 
            key={`${session.session_id}-${session.round_type}`} 
            onClick={() => handleLoadSession(session)}
            style={{ 
              padding: '0.5rem 0.75rem', 
              background: (sessionId === session.session_id && currentView !== 'home') ? '#374151' : 'transparent', 
              borderRadius: '0.5rem', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem'
            }}
            onMouseOver={(e) => { if (sessionId !== session.session_id || currentView === 'home') e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; }}
            onMouseOut={(e) => { if (sessionId !== session.session_id || currentView === 'home') e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ fontWeight: '500', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: (sessionId === session.session_id && currentView !== 'home') ? 'white' : '#9ca3af' }}>
              {session.title}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
              <span>{session.round_type.replace('-', ' ')}</span>
            </div>
          </div>
        ))}
        {sessionsList.length === 0 && (
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '0 0.5rem', marginTop: '0.5rem' }}>
            No previous sessions
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{ width: '100%', background: 'transparent', color: 'white', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'background 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-sidebar-hover)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button 
          onClick={handleLogout}
          style={{ width: '100%', background: 'transparent', color: '#ef4444', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'background 0.2s', marginTop: '0.5rem' }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-sidebar-hover)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (currentView === 'home') {
      return (
        <div style={{ flex: 1, minHeight: '100vh', overflowY: 'auto', background: 'var(--bg-secondary)', padding: '2rem 1rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Welcome, {userName || 'Guest'}!
              </h1>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem', opacity: 0.8 }}>
                AI Interview Platform
              </h2>
              <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
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
    const activeSession = sessionsList.find(s => s.session_id === currentView);
    const roundType = activeSession ? activeSession.round_type : currentView;
    const currentType = interviewTypes.find(type => type.id === roundType) || interviewTypes[0];
    const displayTitle = activeSession ? activeSession.title : currentType.title;
    const currentMessages = messages[currentView] || [];

    return (
      <div style={{ flex: 1, height: '100%', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '72px', background: 'var(--bg-header)', borderBottom: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={() => setCurrentView('home')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem' }} onMouseOver={(e) => e.target.style.color = '#1f2937'} onMouseOut={(e) => e.target.style.color = '#6b7280'}>
                ← Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {currentType && <currentType.icon size={24} color="#374151" />}
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                  {displayTitle}
                </h1>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <button onClick={clearHistory} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }} onMouseOver={(e) => { e.target.style.background = '#fef2f2'; e.target.style.borderColor = '#fca5a5'; }} onMouseOut={(e) => { e.target.style.background = 'white'; e.target.style.borderColor = 'var(--border-light)'; }}>
                Reset Session
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} />
                <span>Live Session</span>
              </div>
            </div>
        </div>

        {/* Chat Area */}
        <div style={{ position: 'absolute', top: '72px', bottom: '88px', left: 0, right: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: currentMessages.length === 0 ? 'center' : 'flex-start' }}>
            {currentMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <Bot size={64} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Ready to start your {currentType?.title.toLowerCase()}?
                </h3>
                <p style={{ color: 'var(--text-muted)' }}>Ask me anything or introduce yourself to begin!</p>
              </div>
            )}

            {currentMessages.map((message, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexDirection: message.type === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: message.type === 'user' ? 'var(--msg-user-bg)' : 'var(--msg-bot-icon)', flexShrink: 0, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  {message.type === 'user' ? <User size={24} color="white" /> : <Bot size={24} color="white" />}
                </div>
                <div style={{ flex: 1, maxWidth: '650px', textAlign: message.type === 'user' ? 'right' : 'left' }}>
                  <div style={{ maxWidth: '80%', padding: '1rem 1.25rem', borderRadius: '1.25rem', marginBottom: '0.5rem', ...(message.type === 'user' ? { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white', marginLeft: 'auto', borderBottomRightRadius: '0.25rem', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' } : { background: 'var(--bg-card)', borderBottomLeftRadius: '0.25rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }) }}>
                    <p style={{ fontSize: '0.875rem', lineHeight: '1.6', margin: 0, color: message.type === 'user' ? 'white' : 'var(--text-main)' }}>
                      {message.content}
                    </p>
                    {message.audioUrl && (
                      <button onClick={() => playAudio(message.audioUrl)} style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: message.type === 'user' ? '#e0e7ff' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }} onMouseOver={(e) => e.target.style.opacity = '0.8'} onMouseOut={(e) => e.target.style.opacity = '1'}>
                        <Volume2 size={14} />
                        <span>Play Audio</span>
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-light)', textAlign: message.type === 'user' ? 'right' : 'left', padding: '0 0.5rem' }}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-sidebar-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={20} color="white" />
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '1rem', padding: '0.75rem 1rem' }}>
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
        </div>

        {/* Input Area */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '88px', padding: '1rem 1.5rem', background: 'transparent', zIndex: 10, boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'end', gap: '0.75rem', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '2rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)', border: '1px solid var(--border-light)', boxSizing: 'border-box' }}>
              <div style={{ flex: 1 }}>
                <textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Type your message or use voice input..."
                  style={{ width: '100%', padding: '0.5rem 1rem', border: 'none', resize: 'none', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', background: 'transparent' }}
                  rows="1"
                  disabled={isLoading}
                />
              </div>
              
              <button onClick={isRecording ? stopRecording : startRecording} style={{ background: isRecording ? '#ef4444' : '#f1f5f9', color: isRecording ? 'white' : '#475569', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', opacity: isRecording ? '0.8' : '1' }} disabled={isLoading}>
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <button onClick={sendMessage} style={{ background: !currentMessage.trim() || isLoading ? '#cbd5e1' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: !currentMessage.trim() || isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: !currentMessage.trim() || isLoading ? 'none' : '0 4px 6px -1px rgba(79, 70, 229, 0.3)' }} disabled={!currentMessage.trim() || isLoading}>
                <Send size={20} style={{ marginLeft: '2px' }} />
              </button>
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
  // Force Webpack recompile
  if (!userId) {
    return <AuthView onLogin={(id, name) => {
      localStorage.setItem('chat_user_id', id);
      localStorage.setItem('chat_user_name', name);
      setUserId(id);
      setUserName(name);
    }} />;
  }


  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow: hidden; background: var(--bg-primary); color: var(--text-main); }
        
        :root {
          --bg-primary: #f8fafc;
          --bg-secondary: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          --bg-card: white;
          --bg-header: #ffffff;
          --bg-input: white;
          --bg-sidebar: #1f2937;
          --bg-sidebar-hover: #374151;
          --text-main: #1f2937;
          --text-muted: #6b7280;
          --text-light: #9ca3af;
          --border: #e2e8f0;
          --border-light: #e5e7eb;
          --shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          --msg-user-bg: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          --msg-bot-bg: white;
          --msg-bot-icon: #1e293b;
        }

        [data-theme='dark'] {
          --bg-primary: #0f172a;
          --bg-secondary: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          --bg-card: #1e293b;
          --bg-header: #1e293b;
          --bg-input: #1e293b;
          --bg-sidebar: #020617;
          --bg-sidebar-hover: #1e293b;
          --text-main: #f8fafc;
          --text-muted: #94a3b8;
          --text-light: #64748b;
          --border: #334155;
          --border-light: #475569;
          --shadow: 0 4px 6px -1px rgba(0,0,0,0.5);
          --msg-user-bg: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          --msg-bot-bg: #1e293b;
          --msg-bot-icon: #0f172a;
        }
      `}</style>
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      {renderSidebar()}
      {renderContent()}
    </div>
    </>
  );
};

export default InterviewApp;