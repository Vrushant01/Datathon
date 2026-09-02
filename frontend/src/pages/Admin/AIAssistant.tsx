import { authFetch } from '../../utils/authFetch';
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

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
      content: 'Hello! I am the KSP Data Assistant. I can help you analyze the CloudScale crime intelligence data using natural language.\n\nTry asking me a question from the suggestions below.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSend = async (question: string) => {
    if (!question.trim()) return;

    const newMsg: Message = { id: Date.now().toString(), role: 'user', content: question };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true }]);

    try {
      const q = encodeURIComponent(question);
      const sid = encodeURIComponent('admin-session-1');
      const response = await authFetch(`${API_BASE_URL}/api/chatbot/chat?question=${q}&sessionId=${sid}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream'
        }
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
          
          const lines = chunkStr.split(/\r?\n/);
          chunkStr = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') {
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m));
              continue;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: `**Error:** ${data.error}` } : m));
              } else if (data.text) {
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + data.text } : m));
              }
            } catch (e) {
              console.error("Error parsing JSON chunk", dataStr);
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
    <div className="flex flex-col flex-grow h-full bg-white shadow-lg border-x border-slate-200 overflow-hidden relative pb-20 xl:pb-0">
      {/* Header */}
      <div className="flex items-center px-6 py-4 bg-ksp-navy text-white">
        <Bot className="text-ksp-gold" size={24} />
        <div className="ml-3">
          <h2 className="font-bold text-lg leading-tight">KSP AI Assistant</h2>
          <p className="text-xs text-slate-300">Hybrid RAG Knowledge Engine</p>
        </div>
      </div>

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
                                      <XAxis dataKey={config.xKey} tick={{ fontSize: 12, fill: '#64748b' }} />
                                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
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
                              return (
                                <div className="w-full h-64 mt-4 mb-4 bg-slate-50 p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
                                  <div className="flex flex-col items-center text-slate-400 gap-2">
                                    <Loader2 size={24} className="animate-spin" />
                                    <span className="text-sm">Generating chart...</span>
                                  </div>
                                </div>
                              );
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
          <p className="text-[10px] text-slate-400 font-medium">AI can make mistakes. All responses are generated directly from the KSP CloudScale Crime Intelligence Engine.</p>
        </div>
      </div>
    </div>
  );
};
