import React, { useState } from 'react';
import { MessageSquare, Send, Bot, User, Sparkles, BookOpen } from 'lucide-react';

export default function Chatbot({ appId }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `Hello! I am your AI Loan Guidance Assistant for Application #${appId}. You can ask me why your application was reviewed/rejected, or ask what-if questions like "What if I take ₹5 Lakhs loan over 48 months?"`,
      sources: []
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    
    // Append user message
    const updatedMessages = [...messages, { sender: 'user', text: userText }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/f5/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: appId,
          message: userText,
          history: updatedMessages.map(m => ({ role: m.sender, content: m.text }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: data.reply,
          sources: data.sources || [],
          whatif_result: data.whatif_result
        }]);
      } else {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: "I encountered a problem processing your request. Please try again or check your parameters.",
          sources: []
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: "Error connecting to guidance assistant service.",
        sources: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[550px] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-xl shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Loan Policy Guidance RAG Bot</span>
              <span className="px-2 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-full text-[10px] font-semibold">
                TF-IDF + Gemini
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Contextual answers powered by Policy Docs & Engine Math</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-2.5 ${m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm ${
              m.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400 border border-slate-700'
            }`}>
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-[82%] space-y-2 ${m.sender === 'user' ? 'items-end' : ''}`}>
              <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-inner'
              }`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>

              {/* Sources tags */}
              {m.sources && m.sources.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[10px]">
                  <span className="text-slate-500 flex items-center space-x-1">
                    <BookOpen className="w-3 h-3" />
                    <span>Policy Sources:</span>
                  </span>
                  {m.sources.map((src, sidx) => (
                    <span key={sidx} className="bg-slate-950 text-slate-400 border border-slate-800 px-2 py-0.5 rounded font-mono">
                      {src}
                    </span>
                  ))}
                </div>
              )}

              {/* Whatif Card if present */}
              {m.whatif_result && (
                <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 text-[11px] space-y-1">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>Engine Simulation Result</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      m.whatif_result.recommendation === 'Approve' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                    }`}>
                      {m.whatif_result.recommendation}
                    </span>
                  </div>
                  <div className="text-slate-300">
                    EMI: <strong>₹{m.whatif_result.emi_amount?.toLocaleString()}</strong> | EMI Ratio: <strong>{(m.whatif_result.emi_ratio * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs italic p-2">
            <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Consulting policy knowledge base & engine...</span>
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask why rejected or type 'What if I take ₹5L loan for 48m?'"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
