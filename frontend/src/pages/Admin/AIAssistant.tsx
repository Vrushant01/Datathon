import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, BarChart2, RefreshCw } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'Hello! I am the KSP Data Assistant. I can help you analyze the MongoDB crime databases using natural language.\n\nTry asking me a question from the suggestions below.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "How many FIRs were registered today?",
    "Show today's crime statistics.",
    "Top crime districts.",
    "Most active police station.",
    "Vehicle thefts this month.",
    "Officer performance.",
    "Recent alerts."
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5000' : 'https://datathon-qs4x.onrender.com';

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chatbot/analytics`);
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (showAnalytics) {
      fetchAnalytics();
    }
  }, [showAnalytics]);

  const handleSend = async (question: string) => {
    if (!question.trim()) return;

    const newMsg: Message = { id: Date.now().toString(), role: 'user', content: question };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true }]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ question, sessionId: 'admin-session-1' })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (reader) {
        let chunkStr = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunkStr += decoder.decode(value, { stream: true });
          
          const lines = chunkStr.split('\n\n');
          chunkStr = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '');
              if (dataStr === '[DONE]') {
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m));
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.error) {
                  setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: `**Error:** ${data.error}` } : m));
                } else if (data.text) {
                  setMessages(prev => prev.map(m => {
                    if (m.id === assistantMsgId) {
                      return { ...m, content: m.content + data.text };
                    }
                    return m;
                  }));
                }
              } catch (e) {
                console.error("Error parsing JSON chunk", dataStr);
              }
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: 'Error communicating with AI Assistant.', isStreaming: false } : m));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-grow h-full bg-white shadow-lg border-x border-slate-200 overflow-hidden relative">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 bg-ksp-navy text-white">
        <div className="flex items-center gap-3">
          <Bot className="text-ksp-gold" size={24} />
          <div>
            <h2 className="font-bold text-lg leading-tight">KSP AI Assistant</h2>
            <p className="text-xs text-slate-300">Hybrid RAG Knowledge Engine</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          <BarChart2 size={16} />
          {showAnalytics ? 'Back to Chat' : 'Analytics'}
        </button>
      </div>

      {showAnalytics ? (
        <div className="flex-grow p-6 overflow-y-auto bg-slate-50">
          <h3 className="text-xl font-bold mb-6 text-slate-800">AI Engine Analytics</h3>
          {analyticsData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-sm">Total Questions</p>
                <p className="text-3xl font-bold text-ksp-navy">{analyticsData.totalQuestions}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-sm">Avg Response Time</p>
                <p className="text-3xl font-bold text-ksp-navy">{analyticsData.averageResponseTime}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-sm">Cache Hit Rate</p>
                <p className="text-3xl font-bold text-emerald-600">{analyticsData.cacheHitRate}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-sm">Token Usage</p>
                <p className="text-3xl font-bold text-ksp-gold">{analyticsData.tokenUsage}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-48">
              <RefreshCw className="animate-spin text-ksp-navy" size={24} />
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Chat Area */}
          <div className="flex-grow overflow-y-auto p-6 bg-slate-50/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-ksp-gold/20 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-ksp-navy" />
                  </div>
                )}
                
                <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-ksp-navy text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 rounded-tl-none text-slate-800'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm prose-slate max-w-none">
                      {msg.content === '' && msg.isStreaming ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 size={14} className="animate-spin" />
                          <span className="text-xs font-medium">Analyzing database...</span>
                        </div>
                      ) : (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              if (!inline && match && match[1] === 'recharts') {
                                try {
                                  const config = JSON.parse(String(children).replace(/\n/g, ''));
                                  
                                  const ChartComponent = config.type === 'LineChart' ? LineChart :
                                                       config.type === 'PieChart' ? PieChart :
                                                       BarChart;
                                                       
                                  const DataComponent: any = config.type === 'LineChart' ? Line :
                                                      config.type === 'PieChart' ? Pie :
                                                      Bar;

                                  return (
                                    <div className="w-full h-64 mt-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                      <h4 className="text-sm font-bold text-center text-slate-700 mb-2">{config.title || 'Data Visualization'}</h4>
                                      <ResponsiveContainer width="100%" height="100%">
                                        <ChartComponent data={config.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                                          <XAxis dataKey={config.xKey} tick={{fontSize: 12, fill: '#64748b'}} />
                                          <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                                          <Tooltip 
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                          />
                                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                                          {config.type === 'PieChart' ? (
                                            <DataComponent dataKey={config.yKey} nameKey={config.xKey} cx="50%" cy="50%" outerRadius={80} fill="#1e3a8a">
                                              {config.data.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#1e3a8a' : '#cba258'} />
                                              ))}
                                            </DataComponent>
                                          ) : (
                                            <DataComponent dataKey={config.yKey} fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                                          )}
                                        </ChartComponent>
                                      </ResponsiveContainer>
                                    </div>
                                  );
                                } catch (e) {
                                  return <code className={className} {...props}>{children}</code>;
                                }
                              }
                              return <code className={className} {...props}>{children}</code>;
                            },
                            table({ children }) {
                              return (
                                <div className="overflow-x-auto my-4 rounded-lg border border-slate-200">
                                  <table className="w-full text-sm text-left">{children}</table>
                                </div>
                              );
                            },
                            th({ children }) {
                              return <th className="bg-slate-100 px-4 py-3 font-semibold text-slate-700 border-b border-slate-200">{children}</th>;
                            },
                            td({ children }) {
                              return <td className="px-4 py-3 border-b border-slate-100">{children}</td>;
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <User size={16} className="text-slate-600" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200">
              <div className="mb-4 flex flex-nowrap overflow-x-auto pb-2 gap-2 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {suggestedQuestions.map((q, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="text-xs shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors border border-slate-200 whitespace-nowrap"
                  >
                    {q}
                  </button>
                ))}
              </div>
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend(input)}
                placeholder="Ask a question about the crime database..."
                className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ksp-navy/20 focus:border-ksp-navy transition-all"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend(input)}
                disabled={isLoading || !input.trim()}
                className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                  isLoading || !input.trim() 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-ksp-navy text-white hover:bg-ksp-navy-light shadow-md hover:shadow-lg'
                }`}
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
              </button>
            </div>
            <div className="mt-2 text-center flex items-center justify-center gap-1.5">
              <Sparkles size={12} className="text-ksp-gold" />
              <p className="text-[10px] text-slate-400 font-medium">AI can make mistakes. All responses are generated directly from the KSP MongoDB clusters.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
