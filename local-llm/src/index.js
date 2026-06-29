import { registerPlugin } from '@wordpress/plugins';
import { PluginSidebar } from '@wordpress/edit-post';
import { useState, useEffect, useRef } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';

const LLM_URL = 'http://192.168.1.177:3000';

// ── Customise these for each client ──────────────────────────────────────────
const PROMPTS = [
  { label: '✏️ Fix my writing',  text: 'Fix any spelling or grammar mistakes in this post. Keep my voice and meaning exactly as it is.' },
  { label: '💬 Simplify it',     text: 'Rewrite this post in warm, simple language that any parent could easily read.' },
  { label: '📋 Summarise',       text: 'Write a friendly 2–3 sentence summary of this post.' },
];
// ─────────────────────────────────────────────────────────────────────────────

const css = `
  #llm-root {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 120px);
    min-height: 400px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    box-sizing: border-box;
  }
  #llm-root *, #llm-root *::before, #llm-root *::after {
    box-sizing: inherit;
  }

  /* ── Sync bar ── */
  #llm-root .llm-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid #e0e0e0;
    flex-shrink: 0;
  }
  #llm-root .llm-sync-btn {
    width: 100%;
    background: #2271b1;
    border: none;
    border-radius: 5px;
    color: #fff;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    padding: 7px 12px;
    transition: background 0.15s;
    text-align: center;
  }
  #llm-root .llm-sync-btn:hover:not(:disabled) { background: #135e96; }
  #llm-root .llm-sync-btn:disabled { background: #a0a0a0; cursor: default; }
  #llm-root .llm-sync-status {
    font-size: 11px;
    color: #757575;
    text-align: center;
    padding: 0 14px 8px;
    flex-shrink: 0;
  }
  #llm-root .llm-sync-status.ok { color: #22c55e; }
  #llm-root .llm-sync-status.stale { color: #f59e0b; }

  /* ── Messages ── */
  #llm-root .llm-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: thin;
  }
  #llm-root .llm-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #aaa;
    font-size: 13px;
    text-align: center;
    padding: 24px;
    line-height: 1.6;
    user-select: none;
  }

  /* ── Bubbles ── */
  #llm-root .llm-msg {
    display: flex;
    flex-direction: column;
    max-width: 90%;
  }
  #llm-root .llm-msg.user      { align-self: flex-end;   align-items: flex-end; }
  #llm-root .llm-msg.assistant { align-self: flex-start; align-items: flex-start; }

  #llm-root .llm-bubble {
    padding: 9px 13px;
    border-radius: 14px;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
  #llm-root .llm-msg.user .llm-bubble {
    background: #2271b1;
    color: #fff;
    border-bottom-right-radius: 3px;
  }
  #llm-root .llm-msg.assistant .llm-bubble {
    background: #f0f0f0;
    color: #1e1e1e;
    border-bottom-left-radius: 3px;
    border: 1px solid #ddd;
  }

  /* ── Typing dots ── */
  #llm-root .llm-typing {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 11px 13px;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 14px;
    border-bottom-left-radius: 3px;
    width: 52px;
  }
  #llm-root .llm-tdot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #999;
    animation: llm-bounce 1.1s infinite ease-in-out;
  }
  #llm-root .llm-tdot:nth-child(2) { animation-delay: 0.15s; }
  #llm-root .llm-tdot:nth-child(3) { animation-delay: 0.30s; }
  @keyframes llm-bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40%           { transform: translateY(-5px); background: #2271b1; }
  }

  /* ── Error ── */
  #llm-root .llm-err {
    align-self: flex-start;
    font-size: 13px;
    color: #b91c1c;
    padding: 8px 12px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    line-height: 1.5;
  }

  /* ── Insert button ── */
  #llm-root .llm-insert-btn {
    margin-top: 5px;
    background: none;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    color: #757575;
    cursor: pointer;
    font-size: 12px;
    padding: 3px 10px;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  #llm-root .llm-insert-btn:hover { background: #e0e8f5; border-color: #2271b1; color: #2271b1; }
  #llm-root .llm-insert-btn.done  { border-color: #22c55e; color: #22c55e; }

  /* ── Prompt chips ── */
  #llm-root .llm-chips {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 14px 6px;
    border-top: 1px solid #e0e0e0;
    flex-shrink: 0;
  }
  #llm-root .llm-chip {
    background: #f6f7f7;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    color: #333;
    cursor: pointer;
    font-size: 13px;
    padding: 7px 12px;
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
    width: 100%;
  }
  #llm-root .llm-chip:hover:not(:disabled) { background: #e0e8f5; border-color: #2271b1; color: #2271b1; }
  #llm-root .llm-chip:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Input row ── */
  #llm-root .llm-input-row {
    display: flex;
    gap: 6px;
    padding: 8px 14px;
    border-top: 1px solid #e0e0e0;
    flex-shrink: 0;
    align-items: flex-end;
  }
  #llm-root .llm-textarea {
    flex: 1;
    resize: none;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.5;
    padding: 7px 10px;
    outline: none;
    font-family: inherit;
    min-height: 36px;
    max-height: 110px;
    overflow-y: auto;
    transition: border-color 0.15s;
    background: #fff;
    color: #1e1e1e;
  }
  #llm-root .llm-textarea::placeholder { color: #aaa; }
  #llm-root .llm-textarea:focus { border-color: #2271b1; box-shadow: 0 0 0 1px #2271b1; }

  #llm-root .llm-send {
    flex-shrink: 0;
    width: 36px; height: 36px;
    border: none;
    border-radius: 8px;
    background: #2271b1;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.1s;
    padding: 0;
  }
  #llm-root .llm-send:hover:not(:disabled) { background: #135e96; }
  #llm-root .llm-send:active:not(:disabled) { transform: scale(0.93); }
  #llm-root .llm-send:disabled { background: #c0c0c0; cursor: not-allowed; }
  #llm-root .llm-send svg { width: 15px; height: 15px; }
`;

const SendIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor"/>
  </svg>
);

const AIChatSidebar = () => {
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [syncedContent, setSyncedContent] = useState('');
  const [syncLabel,    setSyncLabel]    = useState('');
  const [insertedIdx,  setInsertedIdx]  = useState(null);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  const { insertBlock } = useDispatch('core/block-editor');

  const postContent = useSelect((select) =>
    select('core/editor')?.getEditedPostAttribute('content') ?? ''
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const isSynced = syncedContent !== '' && syncedContent === postContent;
  const isStale  = syncedContent !== '' && syncedContent !== postContent;

  const syncNow = () => {
    setSyncedContent(postContent);
    setSyncLabel('✓ Your post is ready');
    setTimeout(() => setSyncLabel(''), 2000);
  };

  const insertIntoPost = (text, msgIdx) => {
    const block = wp.blocks.createBlock('core/paragraph', { content: text });
    insertBlock(block);
    setInsertedIdx(msgIdx);
    setTimeout(() => setInsertedIdx(null), 2000);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(input.trim()); }
  };

  const sendText = async (text) => {
    if (!text || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const res = await fetch(`${LLM_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context: syncedContent }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'The writing assistant is not available right now. Please try again in a moment.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const statusText = syncLabel
    ? syncLabel
    : isSynced ? 'Ready — ask me anything about your post'
    : isStale  ? 'Your post has changed — click to update'
    : '';

  const statusClass = syncLabel ? 'ok'
    : isSynced ? 'ok'
    : isStale  ? 'stale'
    : '';

  return (
    <>
      <style>{css}</style>
      <PluginSidebar name="llm-sidebar" title="Writing Assistant" icon="edit">
        <div id="llm-root">

          {/* Sync bar */}
          <div className="llm-bar">
            <button
              className="llm-sync-btn"
              onClick={syncNow}
              disabled={!postContent || loading}
            >
              {isSynced ? '🔄 Update my post' : '📄 Use my post'}
            </button>
          </div>
          {statusText && (
            <div className={`llm-sync-status ${statusClass}`}>{statusText}</div>
          )}

          {/* Messages */}
          <div className="llm-messages">
            {messages.length === 0 && !loading && (
              <div className="llm-empty">
                <span style={{ fontSize: 28 }}>👋</span>
                <span>
                  Click <strong>"Use my post"</strong> above,<br />
                  then choose one of the buttons below<br />
                  or type your own question.
                </span>
              </div>
            )}

            {messages.map((msg, i) => {
              if (msg.role === 'error') return <div key={i} className="llm-err">{msg.content}</div>;
              return (
                <div key={i} className={`llm-msg ${msg.role}`}>
                  <div className="llm-bubble">{msg.content}</div>
                  {msg.role === 'assistant' && (
                    <button
                      className={`llm-insert-btn${insertedIdx === i ? ' done' : ''}`}
                      onClick={() => insertIntoPost(msg.content, i)}
                    >
                      {insertedIdx === i ? '✓ Added to post' : '↓ Add to post'}
                    </button>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="llm-msg assistant">
                <div className="llm-typing">
                  <span className="llm-tdot" /><span className="llm-tdot" /><span className="llm-tdot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Prompt chips */}
          <div className="llm-chips">
            {PROMPTS.map((p) => (
              <button
                key={p.label}
                className="llm-chip"
                disabled={loading}
                onClick={() => sendText(p.text)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Free-text input */}
          <div className="llm-input-row">
            <textarea
              ref={textareaRef}
              className="llm-textarea"
              rows={1}
              placeholder="Or type your own question…"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="llm-send"
              onClick={() => sendText(input.trim())}
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </div>

        </div>
      </PluginSidebar>
    </>
  );
};

registerPlugin('llm-sidebar', { render: AIChatSidebar });
