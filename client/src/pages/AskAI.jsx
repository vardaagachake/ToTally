import { useState, useRef, useEffect } from 'react';
import { askQuestion } from '../api';

export default function AskAI() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your ToTally finance AI. Ask me anything about your reconciliation data — in English, Hindi, or Hinglish! 🇮🇳\n\nTry: "Show me unmatched transactions" or "ye 200 rupay ka hisab nahi mil raha"', sourceRows: null },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('auto');
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis.cancel(); // Stop speaking on unmount
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        // Try to set language based on dropdown, fallback to hi-IN for hinglish/auto for better Hindi mixing
        recognitionRef.current.lang = language === 'en' ? 'en-US' : (language === 'hi' ? 'hi-IN' : 'hi-IN');
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("Your browser does not support Voice Input.");
      }
    }
  };

  const speakText = (text, force = false) => {
    if ((!voiceEnabled && !force) || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to pick a Hindi voice if we're dealing with Hindi/Hinglish
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
    if (hindiVoice && (language === 'hi' || language === 'hinglish' || language === 'auto')) {
      utterance.voice = hindiVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  async function handleSend() {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const res = await askQuestion(question, language);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.answer,
          sourceRows: res.data.sourceRows,
        },
      ]);
      speakText(res.data.answer);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', sourceRows: null },
      ]);
      speakText('Sorry, I encountered an error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const suggestedQuestions = [
    'What is my match rate?',
    'Show me the top 3 exceptions',
    'ye 200 rupay ka hisab nahi mil raha',
    'Which vendors have overdue payments?',
    'कुल GST कितना है?',
    'TechServ ka total spend kitna hai?',
  ];

  return (
    <div className="animate-fade-in h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Ask AI</h1>
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`text-sm px-3 py-1.5 rounded-full flex items-center gap-2 transition-all ${voiceEnabled ? 'bg-rzp-blue/10 text-rzp-blue' : 'bg-gray-100 text-gray-500'}`}
          >
            {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
          </button>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-gray-500">Multilingual Q&A grounded in your reconciliation data</p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-xs border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="auto">🌐 Auto-detect</option>
            <option value="en">🇬🇧 English</option>
            <option value="hi">🇮🇳 Hindi</option>
            <option value="hinglish">🇮🇳 Hinglish</option>
          </select>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto rounded-xl bg-white border border-gray-200 p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 group ${
                  msg.role === 'user'
                    ? 'bg-rzp-blue text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  <div className="flex items-start gap-2">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === 'assistant' && (
                      <button 
                        onClick={() => speakText(msg.content, true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-rzp-blue flex-shrink-0 mt-0.5"
                        title="Read aloud"
                      >
                        🔊
                      </button>
                    )}
                  </div>
                  {msg.sourceRows && Object.keys(msg.sourceRows).length > 0 && (
                    <button
                      onClick={() => {
                        const el = document.getElementById(`source-${i}`);
                        if (el) el.classList.toggle('hidden');
                      }}
                      className={`text-xs mt-2 font-medium ${msg.role === 'user' ? 'text-blue-200' : 'text-rzp-blue'} hover:underline`}
                    >
                      📎 View Source Rows
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Source Rows Panels (hidden by default) */}
          {messages.map((msg, i) => (
            msg.sourceRows && Object.keys(msg.sourceRows).length > 0 && (
              <div key={`source-${i}`} id={`source-${i}`} className="hidden mt-2 animate-fade-in">
                <div className="bg-white border border-gray-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                  <h4 className="text-xs font-semibold text-gray-500 mb-2">📎 Source Rows</h4>
                  {Object.entries(msg.sourceRows).map(([label, rows]) => (
                    <div key={label} className="mb-2">
                      <p className="text-xs font-medium text-navy">{label} ({Array.isArray(rows) ? rows.length : 0} records)</p>
                      {Array.isArray(rows) && rows.slice(0, 5).map((row, ri) => (
                        <div key={ri} className="text-xs text-gray-500 font-mono bg-gray-50 rounded px-2 py-1 mt-1 truncate">
                          {row.referenceNo || row.invoiceNo || row.settlementId || row.name || JSON.stringify(row).substring(0, 100)}
                          {row.amount != null && ` — ₹${row.amount.toLocaleString('en-IN')}`}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}

          {/* Input */}
          <div className="mt-3 flex gap-2">
            <button 
              onClick={toggleListening}
              className={`p-3 rounded-xl flex-shrink-0 transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title="Voice Input"
            >
              🎤
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? "Listening..." : "Ask about your finances (in any language)..."}
              className="input-field flex-1"
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading || (!input.trim() && !isListening)} className="btn-primary px-6">
              {loading ? '⏳' : '→'}
            </button>
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="w-72 shrink-0 hidden lg:block">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-navy mb-3">💡 Try asking</h3>
            <div className="space-y-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); }}
                  className="w-full text-left p-2.5 rounded-lg bg-gray-50 hover:bg-rzp-blue/5 hover:border-rzp-blue/20 border border-transparent text-xs text-gray-600 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
