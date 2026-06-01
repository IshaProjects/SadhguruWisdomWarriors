import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Zap, FileText, TrendingUp, SearchX, Loader2, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api.js';


// ── quick action buttons ──────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label: 'Summarize latest',
    message: 'Summarize latest',
    icon: FileText,
    desc: 'Summary of most recently ingested video',
  },
  {
    label: 'Generate Shorts ideas',
    message: 'Generate Shorts ideas',
    icon: Zap,
    desc: 'YouTube Shorts content ideas from ingested videos',
  },
  {
    label: 'Find content gaps',
    message: 'Find content gaps',
    icon: SearchX,
    desc: 'Topics not yet covered in your ingested library',
  },
];

// ── message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={clsx('flex items-end gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={clsx(
        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-0.5',
        isUser ? 'bg-accent-500/20 text-accent-400' : 'bg-dark-700 text-dark-300'
      )}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble */}
      <div className={clsx(
        'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-accent-600 text-white rounded-br-sm'
          : 'bg-dark-800 border border-dark-700 text-dark-100 rounded-bl-sm'
      )}>
        {msg.content}
        {msg.sources?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-dark-600 flex flex-wrap gap-1">
            {msg.sources.map((s, i) => (
              <span key={i} className="text-xs bg-dark-700 text-dark-400 px-2 py-0.5 rounded">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-end gap-2.5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-0.5 bg-dark-700 text-dark-300">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="bg-dark-800 border border-dark-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-400" />
          <span className="text-xs text-dark-400">Thinking…</span>
        </div>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function RAGChat() {
  const [messages,  setMessages]  = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI assistant for the ingested video library. Ask me anything about the content — or use one of the quick actions below to get started.",
      sources: [],
    },
  ]);
  const [input,     setInput]     = useState('');
  const [thinking,  setThinking]  = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const sendMessage = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || thinking) return;

    const userMsg = { role: 'user', content: trimmed, sources: [] };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    try {
      // Build history (exclude the initial greeting)
      const history = messages
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data } = await api.post('/video-queue/chat', {
        message: trimmed,
        history,
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources ?? [] },
      ]);
    } catch (err) {
      const errorText =
        err.response?.data?.message ||
        'Sorry, something went wrong. Please try again.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errorText, sources: [] },
      ]);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[520px]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-accent-400" />
        <h2 className="text-base font-semibold">AI Knowledge Chat</h2>
        <span className="ml-1 text-xs text-dark-500 bg-dark-800 border border-dark-700 px-2 py-0.5 rounded-full">
          RAG · Vertex AI
        </span>
      </div>

      {/* ── Message history ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 min-h-0">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {thinking && <ThinkingBubble />}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      <div className="mb-3">
        <p className="text-xs text-dark-500 mb-2">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => sendMessage(action.message)}
                disabled={thinking}
                title={action.desc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-dark-800 border border-dark-700 text-dark-300
                           hover:bg-dark-700 hover:border-accent-500/40 hover:text-dark-100
                           transition-colors disabled:opacity-40"
              >
                <Icon className="w-3.5 h-3.5 text-accent-400" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Input row ───────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={thinking}
          rows={1}
          placeholder="Ask about your ingested videos… (Enter to send, Shift+Enter for new line)"
          className="flex-1 bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 text-sm
                     text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-500
                     resize-none transition-colors disabled:opacity-50"
          style={{ minHeight: '48px', maxHeight: '120px' }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || thinking}
          className="p-3 rounded-xl bg-accent-600 hover:bg-accent-500 text-white
                     transition-colors disabled:opacity-40 shrink-0"
        >
          {thinking
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
