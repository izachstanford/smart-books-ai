import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, BookOpen, RefreshCw } from 'lucide-react';
import { Book } from '../App';

interface Props {
  books: Book[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; author: string; relevance: number }>;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  "What should I read if I loved 'Project Hail Mary'?",
  "Recommend a book for a long flight",
  "What are my reading blindspots?",
  "Find me something similar to my 5-star books",
  "What's a cozy mystery from my to-read list?",
];

/**
 * AIBookChat - Chat interface for book recommendations
 * Stateless Q&A (no conversation memory in Phase 1)
 */
const AIBookChat: React.FC<Props> = ({ books }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Hi! I'm your AI Book Advisor. I know your library of **${books.length} books** and can help you discover your next great read.\n\nTry asking me things like:\n- "What should I read next based on my favorites?"\n- "Find me a fast-paced thriller from my to-read list"\n- "What patterns do you see in my 5-star books?"`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simple client-side response (in production, this calls the Netlify function)
  const generateResponse = async (query: string): Promise<{ content: string; sources: Message['sources'] }> => {
    const queryLower = query.toLowerCase();
    const fiveStarBooks = books.filter(b => b.my_rating === 5 && b.description);
    const toReadBooks = books.filter(b => b.shelf === 'to-read' && b.description);
    const readBooks = books.filter(b => b.shelf === 'read' && b.description);
    
    // Simple keyword-based responses for demo
    let content = '';
    let sources: Message['sources'] = [];

    if (queryLower.includes('5-star') || queryLower.includes('favorite') || queryLower.includes('best')) {
      const topBooks = fiveStarBooks.slice(0, 5);
      content = `## Your 5-Star Favorites\n\nYou've given **${fiveStarBooks.length} books** a perfect 5-star rating. Here are some of your top picks:\n\n`;
      topBooks.forEach((book, i) => {
        content += `${i + 1}. **${book.title}** by ${book.author}\n`;
      });
      
      if (toReadBooks.length > 0) {
        const similar = toReadBooks.slice(0, 3);
        content += `\n### Similar Books in Your To-Read List\n\nBased on your favorites, you might enjoy:\n\n`;
        similar.forEach((book, i) => {
          content += `- **${book.title}** by ${book.author}\n`;
        });
        sources = similar.map(b => ({ title: b.title, author: b.author, relevance: 0.85 }));
      }
    } else if (queryLower.includes('to-read') || queryLower.includes('queue') || queryLower.includes('next')) {
      content = `## Your To-Read Queue\n\nYou have **${toReadBooks.length} books** waiting to be read!\n\n`;
      
      const sample = toReadBooks.slice(0, 5);
      content += `Here are some highlights:\n\n`;
      sample.forEach((book, i) => {
        content += `${i + 1}. **${book.title}** by ${book.author}\n`;
      });
      sources = sample.map(b => ({ title: b.title, author: b.author, relevance: 0.9 }));
    } else if (queryLower.includes('thriller') || queryLower.includes('mystery') || queryLower.includes('suspense')) {
      const thrillers = books.filter(b => {
        try {
          const genres = JSON.parse(b.genres || '[]');
          return genres.some((g: string) => 
            g.toLowerCase().includes('thriller') || 
            g.toLowerCase().includes('mystery') ||
            g.toLowerCase().includes('suspense')
          );
        } catch { return false; }
      });
      
      content = `## Thrillers & Mysteries in Your Library\n\nI found **${thrillers.length} books** in the thriller/mystery genre:\n\n`;
      thrillers.slice(0, 5).forEach((book, i) => {
        const status = book.shelf === 'read' ? '✅ Read' : '📚 To-Read';
        content += `${i + 1}. **${book.title}** by ${book.author} (${status})\n`;
      });
      sources = thrillers.slice(0, 3).map(b => ({ title: b.title, author: b.author, relevance: 0.8 }));
    } else if (queryLower.includes('pattern') || queryLower.includes('blindspot') || queryLower.includes('insight')) {
      const avgRating = readBooks.length > 0 
        ? (readBooks.reduce((sum, b) => sum + b.my_rating, 0) / readBooks.length).toFixed(2)
        : 0;
      
      content = `## Reading Insights\n\n### Your Stats\n- **Total Books:** ${books.length}\n- **Books Read:** ${readBooks.length}\n- **Average Rating:** ${avgRating} ★\n- **5-Star Books:** ${fiveStarBooks.length}\n\n`;
      content += `### Observations\n\n`;
      content += `You have **${toReadBooks.length} books** in your to-read queue. `;
      
      if (fiveStarBooks.length > 0) {
        content += `Your favorites tend to be diverse, which suggests you're open to different genres!\n\n`;
      }
      
      content += `💡 **Tip:** Try exploring genres you haven't rated 5-stars yet to expand your reading horizons.`;
    } else {
      // Default response
      content = `I'd be happy to help you explore your library!\n\n`;
      content += `Here are some things I can help with:\n`;
      content += `- Find books similar to your favorites\n`;
      content += `- Explore your to-read queue\n`;
      content += `- Discover patterns in your reading habits\n`;
      content += `- Recommend books by genre or mood\n\n`;
      content += `*Note: In the full version, I'll use semantic search and Claude AI to give you much more personalized recommendations!*`;
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    return { content, sources };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateResponse(input);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        sources: response.sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <div className="chat-title">
          <Bot size={24} />
          <div>
            <h2>AI Book Advisor</h2>
            <p>Powered by your library of {books.length} books</p>
          </div>
        </div>
        <div className="chat-badge">
          <Sparkles size={14} />
          <span>Stateless Mode</span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div className="message-content">
              <div 
                className="message-text"
                dangerouslySetInnerHTML={{ 
                  __html: message.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/## (.*?)$/gm, '<h3>$1</h3>')
                    .replace(/### (.*?)$/gm, '<h4>$1</h4>')
                    .replace(/- (.*?)$/gm, '<li>$1</li>')
                    .replace(/\n/g, '<br />')
                }}
              />
              
              {message.sources && message.sources.length > 0 && (
                <div className="message-sources">
                  <span className="sources-label">
                    <BookOpen size={12} /> Sources
                  </span>
                  <div className="sources-list">
                    {message.sources.map((source, i) => (
                      <span key={i} className="source-tag">
                        {source.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">
              <Bot size={18} />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-suggestions">
        {SUGGESTED_PROMPTS.slice(0, 3).map((prompt) => (
          <button
            key={prompt}
            className="suggestion-btn"
            onClick={() => handleSuggestedPrompt(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="chat-input-wrapper">
        <textarea
          className="chat-input"
          placeholder="Ask me about your books..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? <RefreshCw size={20} className="spinning" /> : <Send size={20} />}
        </button>
      </div>

      <div className="chat-footer">
        <p>💡 Full RAG integration with Claude coming soon! Currently using local pattern matching.</p>
      </div>

      <style>{`
        .ai-chat {
          max-width: 800px;
          margin: 0 auto;
          height: calc(100vh - 250px);
          min-height: 500px;
          display: flex;
          flex-direction: column;
        }
        
        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-lg);
        }
        
        .chat-title {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        
        .chat-title h2 {
          font-size: 1.25rem;
          margin-bottom: 0;
        }
        
        .chat-title p {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }
        
        .chat-badge {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }
        
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-md);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-md);
        }
        
        .message {
          display: flex;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
          animation: slideUp var(--transition-base) ease;
        }
        
        .message.user {
          flex-direction: row-reverse;
        }
        
        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .message.assistant .message-avatar {
          background: var(--color-cosmic-purple);
          color: white;
        }
        
        .message.user .message-avatar {
          background: var(--color-nebula-light);
          color: var(--color-text-secondary);
        }
        
        .message-content {
          max-width: 80%;
        }
        
        .message.user .message-content {
          text-align: right;
        }
        
        .message-text {
          padding: var(--space-md);
          border-radius: var(--radius-md);
          line-height: 1.6;
        }
        
        .message.assistant .message-text {
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
        }
        
        .message.user .message-text {
          background: var(--color-cosmic-purple);
          color: white;
        }
        
        .message-text h3 {
          font-size: 1rem;
          margin: var(--space-md) 0 var(--space-sm);
        }
        
        .message-text h4 {
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          margin: var(--space-sm) 0;
        }
        
        .message-text li {
          margin-left: var(--space-md);
          margin-bottom: var(--space-xs);
        }
        
        .message-sources {
          margin-top: var(--space-sm);
          padding-top: var(--space-sm);
          border-top: 1px solid var(--color-border);
        }
        
        .sources-label {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.7rem;
          color: var(--color-text-muted);
          margin-bottom: var(--space-xs);
        }
        
        .sources-list {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-xs);
        }
        
        .source-tag {
          padding: 2px 8px;
          background: rgba(77, 166, 255, 0.15);
          border: 1px solid var(--color-blue-giant);
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          color: var(--color-blue-giant);
        }
        
        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: var(--space-md);
        }
        
        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-cosmic-purple);
          animation: bounce 1.4s ease-in-out infinite;
        }
        
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
        
        .chat-suggestions {
          display: flex;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
          overflow-x: auto;
          padding-bottom: var(--space-xs);
        }
        
        .suggestion-btn {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-nebula);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          color: var(--color-text-secondary);
          font-size: 0.8rem;
          white-space: nowrap;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .suggestion-btn:hover {
          background: var(--color-cosmic-purple);
          border-color: var(--color-cosmic-purple);
          color: white;
        }
        
        .chat-input-wrapper {
          display: flex;
          gap: var(--space-sm);
        }
        
        .chat-input {
          flex: 1;
          padding: var(--space-md);
          background: var(--color-nebula-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-family: var(--font-main);
          font-size: 1rem;
          resize: none;
        }
        
        .chat-input:focus {
          outline: none;
          border-color: var(--color-cosmic-purple);
        }
        
        .send-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-cosmic-purple);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .send-btn:hover:not(:disabled) {
          background: #b366f0;
          box-shadow: var(--shadow-glow);
        }
        
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .chat-footer {
          margin-top: var(--space-md);
          text-align: center;
        }
        
        .chat-footer p {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
};

export default AIBookChat;
