import React, { useState, useEffect, useRef } from 'react'
import AdaptaSidebar from './components/AdaptaSidebar.jsx'
import AdaptaResultCard from './components/AdaptaResultCard.jsx'
import DocumentViewer from './components/DocumentViewer.jsx'
import { adaptMessage } from './services/api.js'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '16px', background: '#3b0826', borderRadius: '12px', border: '1px solid #ff00ad55', color: '#ffd0f2', margin: '10px 0' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Display Recovery</div>
          <div style={{ fontSize: '12px', color: '#ff9ee6' }}>{this.state.error?.message || 'Unable to render this card.'}</div>
        </div>
      )
    }
    return this.props.children
  }
}

const STORAGE_KEY = 'adapta_sessions_v1'

const GENERIC_GREETINGS = new Set([
  'hi', 'hello', 'hey', 'ji', 'hlo', 'yo', 'sup', 'namaste', 'hola', 'greetings',
  'good morning', 'good afternoon', 'good evening', 'how are you', 'how are u',
  'how r u', 'hows it going', 'whats up', 'ok', 'okay', 'thanks', 'thank you',
  'bro', 'dude', 'bhai', 'machan', 'yaar', 'buddy', 'man'
])

function isGreeting(text) {
  if (!text) return true
  const clean = text.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
  if (clean.length <= 2) return true
  if (GENERIC_GREETINGS.has(clean)) return true
  return /^(?:hi+|h[ea]y+|h[ea]llo+|hlo|hola|greetings?|yo+|sup|namaste|bro|dude|bhai|yaar|buddy)(?:\s+(?:there|adapta|agent|bot|all|team|friend|buddy))?$/.test(clean) ||
         /^(?:(?:hi+|h[ea]y+|h[ea]llo+|hlo)\s+)?(?:how|hw)\s+(?:r|are|re)\s+(?:u|you|yu)(?:\s+doing)?$/.test(clean) ||
         /^(?:hru|whats?\s+up|hows?\s+it\s+going|hows?\s+u)$/.test(clean)
}

function shorten(str, max = 38) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max).trim() + '...' : str
}

function cleanTitle(str) {
  if (!str) return ''
  return str.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function deriveSmartTitle(userText, fileName, aiResponse) {
  try {
    if (fileName && typeof fileName === 'string') {
      const base = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim()
      if (base) {
        const formatted = base.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
        return shorten(formatted, 38)
      }
    }

    if (aiResponse && aiResponse.type === 'adaptation') {
      const cname = aiResponse.omnichannel_payload?.campaign_name
      if (typeof cname === 'string' && cname.trim()) {
        return shorten(cleanTitle(cname), 38)
      }
      const subs = aiResponse.channels?.email?.subject_lines
      const sub = Array.isArray(subs) ? subs[0] : (typeof subs === 'string' ? subs : null)
      if (typeof sub === 'string' && sub.trim()) {
        const cleanedSub = sub.replace(/^(?:introducing|update|announcement|alert):\s*/i, '')
        return shorten(cleanTitle(cleanedSub), 38)
      }
    }

    if (userText && typeof userText === 'string' && !isGreeting(userText)) {
      let clean = userText.trim().replace(/\s+/g, ' ')
      clean = clean.replace(/^(?:can you|please|kindly|could you|would you|i want to|i need to|help me|can u|plz|tell me|explain)\s+/i, '')
      clean = clean.replace(/^(?:adapt|transform|reformat|tailor|optimize|distribute|write)\s+(?:this|the|my|our|an?|some)?\s*/i, '')
      clean = clean.replace(/^(?:message|announcement|content|email|copy|campaign)\s+(?:for|on|about|regarding)?\s*/i, '')
      clean = clean.replace(/^[?:!.,-\s]+/, '')
      if (clean.length > 2) {
        const words = clean.split(' ').slice(0, 5).join(' ')
        const capitalized = words.charAt(0).toUpperCase() + words.slice(1)
        return shorten(capitalized, 38)
      }
    }

    if (aiResponse && aiResponse.type === 'chat' && userText && typeof userText === 'string' && !isGreeting(userText)) {
      const clean = userText.trim().replace(/[?!.]+$/, '')
      const words = clean.split(' ').slice(0, 5).join(' ')
      return shorten(cleanTitle(words), 38)
    }
  } catch (e) {
    console.warn('deriveSmartTitle error:', e)
  }

  return 'Omnichannel Adaptation'
}

function formatTimestamp(ts) {
  if (!ts) return 'TODAY'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) {
    return `TODAY · ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  } else if (diffDays === 1) {
    return 'YESTERDAY'
  } else {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
  }
}

function getPreview(messages) {
  try {
    if (!messages || !Array.isArray(messages) || messages.length === 0) return 'Omnichannel message adaptations.'
    const lastAi = [...messages].reverse().find(m => m?.role === 'ai')
    const summary = lastAi?.data?.adaptation_readiness?.summary
    if (typeof summary === 'string' && summary.trim()) {
      return summary.slice(0, 85) + (summary.length > 85 ? '...' : '')
    }
    const msgTxt = lastAi?.data?.message
    if (typeof msgTxt === 'string' && msgTxt.trim()) {
      return msgTxt.slice(0, 85) + (msgTxt.length > 85 ? '...' : '')
    }
    const docMsg = messages.find(m => m?.file?.name)
    if (docMsg?.file?.name) {
      return `Attached document: ${docMsg.file.name}`
    }
    const userMsg = messages.find(m => m?.role === 'user' && typeof m.content === 'string' && m.content && !isGreeting(m.content))
    if (userMsg?.content) {
      return userMsg.content.slice(0, 85) + (userMsg.content.length > 85 ? '...' : '')
    }
  } catch (e) {
    console.warn('getPreview error:', e)
  }
  return 'Omnichannel channel copy and campaign variants.'
}

export default function App() {
  const [view, setView] = useState('home') // 'home' | 'chat'
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return []
      const list = JSON.parse(saved).filter(s => s.messages && s.messages.length > 0)
      return list.map(s => {
        let t = s.title || 'Omnichannel Adaptation'
        let hasTopic = s.hasTopicTitle || false
        if (!s.titleLocked) {
          const firstUser = (s.messages || []).find(m => m.role === 'user' && !isGreeting(m.content))
          const firstFile = (s.messages || []).find(m => m.file?.name)
          const firstAi = (s.messages || []).find(m => m.role === 'ai')
          if (firstUser || firstFile) {
            t = deriveSmartTitle(firstUser?.content, firstFile?.file?.name, firstAi?.data)
            hasTopic = true
          } else if (t === 'New Adaptation' || isGreeting(t)) {
            t = 'Omnichannel Consultation'
          }
        }
        return { ...s, title: t, hasTopicTitle: hasTopic }
      })
    } catch {
      return []
    }
  })

  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [title, setTitle] = useState('New Adaptation')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [inputVal, setInputVal] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeViewerDoc, setActiveViewerDoc] = useState(null)

  const fileInputRef = useRef(null)
  const homeFileInputRef = useRef(null)

  useEffect(() => {
    const valid = sessions.filter(s => s.messages && s.messages.length > 0)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid))
  }, [sessions])

  const scrollToBottom = () => {
    setTimeout(() => {
      const container = document.querySelector('.messages')
      if (!container) return
      const aiCards = container.querySelectorAll('.bubble.ai')
      if (aiCards.length > 0) {
        aiCards[aiCards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        container.scrollTop = container.scrollHeight
      }
    }, 100)
  }

  useEffect(() => {
    if (view === 'chat') {
      scrollToBottom()
    }
  }, [messages, view])

  function handleNewChat() {
    setCurrentSessionId(null)
    setMessages([])
    setTitle('New Adaptation')
    setEditingTitle(false)
    setTitleDraft('')
    setSelectedFile(null)
    setActiveViewerDoc(null)
    setView('chat')
  }

  function handleLoadSession(id) {
    const sess = sessions.find(s => s.id === id)
    if (!sess) return
    setCurrentSessionId(sess.id)
    setMessages(sess.messages || [])
    setTitle(sess.title || 'New Adaptation')
    setEditingTitle(false)
    setTitleDraft('')
    setSelectedFile(null)
    setActiveViewerDoc(null)
    setView('chat')
  }

  function handleRenameSession(id, newTitle) {
    const clean = newTitle.trim() || 'Untitled adaptation'
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: clean, titleLocked: true } : s))
    if (currentSessionId === id) {
      setTitle(clean)
    }
  }

  function commitTitle() {
    const clean = titleDraft.trim()
    if (clean && clean !== title) {
      setTitle(clean)
      if (currentSessionId) {
        handleRenameSession(currentSessionId, clean)
      }
    }
    setEditingTitle(false)
  }

  function handleDeleteSession(id) {
    setSessions(prev => prev.filter(s => s.id !== id))
    if (currentSessionId === id) {
      handleNewChat()
    }
  }

  function openDocument(docMeta) {
    if (!docMeta) return
    const docObj = {
      name: docMeta.filename || 'Document',
      viewUrl: docMeta.view_url
        ? (docMeta.view_url.startsWith('http') ? docMeta.view_url : `${import.meta.env.VITE_API_BASE || ''}${docMeta.view_url}`)
        : null,
      downloadUrl: docMeta.url
        ? (docMeta.url.startsWith('http') ? docMeta.url : `${import.meta.env.VITE_API_BASE || ''}${docMeta.url}`)
        : null,
      preview: docMeta.preview || '',
      rawMeta: docMeta
    }
    setActiveViewerDoc(docObj)
  }

  function handleStartFromHome(initialText, file) {
    const newSessionId = 'adapta_' + Date.now()
    setCurrentSessionId(newSessionId)
    setMessages([])
    const initialSmartTitle = deriveSmartTitle(initialText, file?.name, null)
    setTitle(initialSmartTitle)
    setView('chat')

    if (file || initialText) {
      executeSend(initialText, file, newSessionId, [], initialSmartTitle)
    }
  }

  async function executeSend(textToSend, fileToSend, targetSessionId, baseMessages = null, initialTitle = null) {
    const cleanText = (textToSend || '').trim()
    if (!cleanText && !fileToSend) return

    const currentList = baseMessages !== null ? baseMessages : messages
    const localUrl = fileToSend ? URL.createObjectURL(fileToSend) : null
    const userMsg = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: cleanText,
      file: fileToSend ? {
        name: fileToSend.name,
        size: fileToSend.size,
        type: fileToSend.type,
        localBlobUrl: localUrl
      } : null
    }

    const updatedMessages = [...currentList, userMsg]
    setMessages(updatedMessages)
    setInputVal('')
    setSelectedFile(null)
    setLoading(true)

    // Build conversation history for API
    const historyPayload = updatedMessages
      .filter(m => m.role === 'user' || (m.role === 'ai' && m.data))
      .slice(-6)
      .map(m => ({
        role: m.role,
        content: m.role === 'user' ? (m.content || m.file?.name || '') : (m.data?.adaptation_readiness?.summary || m.data?.message || 'Omnichannel adaptation response')
      }))

    try {
      const result = await adaptMessage({
        file: fileToSend,
        text: cleanText,
        conversationHistory: historyPayload
      })

      const aiMsg = {
        id: 'ai_' + Date.now(),
        role: 'ai',
        data: result,
        docMeta: result.document || null
      }

      const finalMessages = [...updatedMessages, aiMsg]
      setMessages(finalMessages)

      // Derive smart titling
      const activeId = targetSessionId || currentSessionId || ('adapta_' + Date.now())
      if (!currentSessionId) setCurrentSessionId(activeId)

      setSessions(prev => {
        const existing = prev.find(s => s.id === activeId)
        let newTitle = existing?.title || initialTitle || title

        if (!existing?.titleLocked) {
          const firstUser = finalMessages.find(m => m.role === 'user' && !isGreeting(m.content))
          const firstFile = finalMessages.find(m => m.file?.name)
          const firstAi = finalMessages.find(m => m.role === 'ai')

          if (firstUser || firstFile) {
            newTitle = deriveSmartTitle(firstUser?.content, firstFile?.file?.name, firstAi?.data)
          } else if (newTitle === 'New Adaptation' || isGreeting(newTitle)) {
            newTitle = 'Omnichannel Consultation'
          }
        }

        setTitle(newTitle)

        if (existing) {
          return prev.map(s => s.id === activeId ? {
            ...s,
            title: newTitle,
            messages: finalMessages,
            updatedAt: Date.now()
          } : s)
        } else {
          return [{
            id: activeId,
            title: newTitle,
            messages: finalMessages,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }, ...prev]
        }
      })
    } catch (err) {
      const errorMsg = {
        id: 'err_' + Date.now(),
        role: 'ai',
        data: {
          type: 'chat',
          message: `ADAPTA encountered an error: ${err.message || 'Unable to process adaptation request. Please retry.'}`
        }
      }
      setMessages([...updatedMessages, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  function handleHomeSubmit(e) {
    e.preventDefault()
    const text = inputVal.trim()
    const file = selectedFile
    if (!text && !file) return
    handleStartFromHome(text, file)
  }

  function handleChatSubmit(e) {
    e.preventDefault()
    const text = inputVal.trim()
    const file = selectedFile
    if (!text && !file) return
    executeSend(text, file, currentSessionId)
  }

  return (
    <div className="app">
      <div className="aurora" />

      {/* ========================================================= */}
      {/* HOME PAGE VIEW                                            */}
      {/* ========================================================= */}
      {view === 'home' && (
        <section id="home">
          <header>
            <div className="word">ADAPTA</div>
            <button
              className="enter"
              id="enter"
              type="button"
              onClick={handleNewChat}
            >
              ENTER WORKSPACE ↗
            </button>
          </header>

          <main className="home">
            <div className="eyebrow">CHANNEL MESSAGE ADAPTER</div>
            <h1>One message.<br /><span>Every channel.</span></h1>
            <p className="sub">
              Transform corporate announcements, marketing copy, and documents into channel-optimized messages across Email, SMS, WhatsApp, Push, LinkedIn, X, and In-App.
            </p>

            <div className="promptGlow">
              <form className="prompt" onSubmit={handleHomeSubmit}>
                <input
                  ref={homeFileInputRef}
                  className="fileInput"
                  type="file"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0])
                    }
                  }}
                />
                <button
                  className="startAttach"
                  type="button"
                  aria-label="Add file"
                  title="Add file"
                  onClick={() => homeFileInputRef.current?.click()}
                >
                  <svg className="icon" viewBox="0 0 24 24" width="20" height="20">
                    <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.3-9.3a4 4 0 0 1 5.7 5.7l-9.3 9.3a2 2 0 0 1-2.8-2.8l8.6-8.6" />
                  </svg>
                </button>
                <input
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  placeholder="Ask ADAPTA or attach a file..."
                  aria-label="Start conversation"
                  autoFocus
                />
                <button className="send" type="submit" aria-label="Send">
                  <svg className="icon" viewBox="0 0 24 24" width="18" height="18">
                    <path d="M5 12h13" />
                    <path d="m13 7 5 5-5 5" />
                  </svg>
                </button>
              </form>
            </div>

            {selectedFile && (
              <div className="filePill">
                <span>Attached · {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                <button
                  className="filePillRemove"
                  type="button"
                  onClick={() => setSelectedFile(null)}
                >
                  ✕
                </button>
              </div>
            )}

            <div className="recentHead">
              <span>RECENT CONVERSATIONS</span>
            </div>

            <div className="cards">
              {sessions.length === 0 ? (
                <div className="card emptyCard">
                  <small>READY TO ADAPT</small>
                  <b>No previous conversations yet</b>
                  <p>Type your message or attach any document above to generate omnichannel variants.</p>
                </div>
              ) : (
                sessions.slice(0, 3).map(session => (
                  <button
                    key={session.id}
                    className="card"
                    type="button"
                    onClick={() => handleLoadSession(session.id)}
                  >
                    <small>{formatTimestamp(session.updatedAt || session.createdAt)}</small>
                    <b>{session.title || 'Omnichannel Adaptation'}</b>
                    <p>{getPreview(session.messages)}</p>
                  </button>
                ))
              )}
            </div>
          </main>
        </section>
      )}

      {/* ========================================================= */}
      {/* CHAT / WORKSPACE PAGE VIEW                                */}
      {/* ========================================================= */}
      {view === 'chat' && (
        <section className="chatPage" id="chatPage">
          <div className={`layout${activeViewerDoc ? ' withViewer' : ''}`}>
            {/* Sidebar */}
            <AdaptaSidebar
              sessions={sessions}
              currentSessionId={currentSessionId}
              onNew={handleNewChat}
              onLoad={handleLoadSession}
              onClose={() => setSidebarOpen(false)}
              isOpen={sidebarOpen}
              onRename={handleRenameSession}
              onDelete={handleDeleteSession}
            />

            {/* Chat Workspace Main Area */}
            <main className="chat">
              <div className="chatHead">
                <div>
                  {editingTitle ? (
                    <input
                      autoComplete="off"
                      autoFocus
                      className="histInput"
                      value={titleDraft}
                      maxLength={60}
                      onChange={e => setTitleDraft(e.target.value)}
                      onBlur={commitTitle}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitTitle()
                        if (e.key === 'Escape') setEditingTitle(false)
                      }}
                    />
                  ) : (
                    <b
                      id="title"
                      title="Click to rename"
                      onClick={() => {
                        setTitleDraft(title)
                        setEditingTitle(true)
                      }}
                    >
                      {title}
                    </b>
                  )}
                  <small>OMNICHANNEL MESSAGE WORKSPACE</small>
                </div>

                <div className="mobileActions">
                  <button
                    className="mobileMenu"
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <svg className="icon" viewBox="0 0 24 24" width="16" height="16">
                      <path d="M5 7h14M5 12h14M5 17h14" />
                    </svg>
                    <span>RECENT</span>
                  </button>
                  <button
                    className="ghost"
                    id="back"
                    type="button"
                    onClick={() => setView('home')}
                  >
                    <svg className="icon" viewBox="0 0 24 24" width="16" height="16">
                      <path d="m3 10 9-7 9 7" />
                      <path d="M5 9v11h14V9" />
                      <path d="M9 20v-6h6v6" />
                    </svg>
                    <span style={{ marginLeft: '7px' }}>HOME</span>
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="messages" id="messages" aria-live="polite">
                {messages.length === 0 && (
                  <div className="card emptyCard" style={{ margin: '40px auto' }}>
                    <small>EMPTY WORKSPACE</small>
                    <b>No adaptations yet</b>
                    <p>Message ADAPTA or attach a file below to begin adapting across all 7 channels.</p>
                  </div>
                )}

                {messages.map(msg => {
                  if (msg.role === 'user') {
                    return (
                      <div key={msg.id} className="bubble user">
                        {msg.file && (
                          <div style={{ marginBottom: msg.content ? '8px' : '0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <svg className="icon" viewBox="0 0 24 24" width="14" height="14">
                              <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.3-9.3a4 4 0 0 1 5.7 5.7l-9.3 9.3a2 2 0 0 1-2.8-2.8l8.6-8.6" />
                            </svg>
                            <b>{msg.file.name}</b>
                            <span style={{ opacity: 0.8 }}>({(msg.file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                        )}
                        {msg.content && <div>{msg.content}</div>}
                      </div>
                    )
                  }

                  if (msg.role === 'ai') {
                    return (
                      <div key={msg.id} className="bubble ai">
                        <ErrorBoundary>
                          <AdaptaResultCard
                            data={msg.data}
                            onOpenDoc={(doc) => openDocument(doc || msg.docMeta)}
                          />
                        </ErrorBoundary>
                      </div>
                    )
                  }

                  return null
                })}

                {loading && (
                  <div className="thinking">
                    <span className="thinkName">ADAPTA</span>
                    <span className="bars">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="composerArea">
                <div className="composer">
                  <form id="form" onSubmit={handleChatSubmit}>
                    <input
                      ref={fileInputRef}
                      className="fileInput"
                      type="file"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0])
                        }
                      }}
                    />
                    <button
                      className="plus"
                      type="button"
                      aria-label="Add file"
                      title="Add file"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg className="icon" viewBox="0 0 24 24" width="18" height="18">
                        <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.3-9.3a4 4 0 0 1 5.7 5.7l-9.3 9.3a2 2 0 0 1-2.8-2.8l8.6-8.6" />
                      </svg>
                    </button>
                    <input
                      id="input"
                      value={inputVal}
                      onChange={e => setInputVal(e.target.value)}
                      placeholder="Message ADAPTA or attach a marketing brief..."
                      maxLength={1000}
                      autoComplete="off"
                      aria-label="Message"
                    />
                    <button className="chatSend" type="submit" aria-label="Send">
                      <svg className="icon" viewBox="0 0 24 24" width="18" height="18">
                        <path d="M5 12h13" />
                        <path d="m13 7 5 5-5 5" />
                      </svg>
                    </button>
                  </form>
                </div>
                {selectedFile && (
                  <div className="filePill" style={{ maxWidth: '820px' }}>
                    <span>Attached · {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      className="filePillRemove"
                      type="button"
                      onClick={() => setSelectedFile(null)}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="fine">
                  ENTERPRISE OMNICHANNEL ADAPTATION ENGINE · SECURE & SANITIZED
                </div>
              </div>
            </main>

            {/* Document Viewer Side Panel */}
            {activeViewerDoc && (
              <DocumentViewer
                doc={activeViewerDoc}
                onClose={() => setActiveViewerDoc(null)}
              />
            )}
          </div>
        </section>
      )}
    </div>
  )
}

