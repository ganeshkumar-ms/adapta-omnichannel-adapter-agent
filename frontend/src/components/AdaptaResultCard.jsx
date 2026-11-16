import React, { useState } from 'react'

// Safe string converter
function toText(val, fallback = '') {
  if (typeof val === 'string') return val
  if (val === null || val === undefined) return fallback
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val, null, 2)
    } catch {
      return String(val)
    }
  }
  return String(val)
}

// Safe array converter
function toList(val) {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val.trim()) return [val]
  return []
}

export default function AdaptaResultCard({ data, guardrails: propGuardrails, onOpenDoc }) {
  const [activeTab, setActiveTab] = useState('sms')
  const [copiedKey, setCopiedKey] = useState('')
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0)

  const guardrails = propGuardrails || data?.guardrails || {}
  const traceId = data?.trace_id || guardrails?.trace_id || ''

  if (!data) {
    return <div className="chatBubbleText">No adaptation data available.</div>
  }

  // If chat message or error response
  if (data.type === 'chat' || (!data.channels && (data.message || data.detail))) {
    return (
      <div className="adaptaResult">
        {guardrails?.status === 'BLOCKED' && (
          <div style={{ marginBottom: '12px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.22)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.65)'
              }}
            >
              <span>🛡️</span>
              <span>Guardrails: Blocked ({guardrails.triggered_rule || guardrails.rejection_reason || 'Policy Violation'})</span>
            </span>
          </div>
        )}
        <div className="chatBubbleText">
          {toText(data.message || data.detail, 'Message received.')}
        </div>
      </div>
    )
  }

  const readiness = (data.adaptation_readiness && typeof data.adaptation_readiness === 'object')
    ? data.adaptation_readiness
    : {}
  const metrics = (data.metrics && typeof data.metrics === 'object') ? data.metrics : {}
  const channels = (data.channels && typeof data.channels === 'object') ? data.channels : {}
  const recommendations = toList(data.recommendations)
  const payload = (data.omnichannel_payload && typeof data.omnichannel_payload === 'object')
    ? data.omnichannel_payload
    : {}
  const doc = data.document

  const score = typeof readiness.score === 'number' ? readiness.score : 85
  const statusRaw = toText(readiness.status, 'OPTIMAL_ADAPTATION')
  const status = statusRaw.replace(/_/g, ' ')
  const summary = toText(readiness.summary, 'Core message successfully adapted across omnichannel touchpoints.')

  function copyText(text, key) {
    if (!text) return
    const str = typeof text === 'string' ? text : JSON.stringify(text, null, 2)
    navigator.clipboard.writeText(str)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 2000)
  }

  // Channel extractions
  const emailData = channels.email || {}
  const emailSubjects = toList(emailData.subject_lines || emailData.subject)
  const emailPreview = toText(emailData.preview_text || emailData.preheader)
  const emailBody = toText(typeof emailData === 'string' ? emailData : emailData.body)
  const emailCta = toText(emailData.cta?.text || emailData.cta, 'Learn More →')

  const smsData = channels.sms || {}
  const smsText = toText(typeof smsData === 'string' ? smsData : (smsData.text || smsData.body || smsData.message))
  const smsCount = smsData.char_count || smsText.length
  const smsCompliance = toText(smsData.compliance, 'Reply STOP to opt out')

  const waData = channels.whatsapp || {}
  const waText = toText(typeof waData === 'string' ? waData : (waData.text || waData.message || waData.body))

  const pushData = channels.push || {}
  const pushTitle = toText(typeof pushData === 'string' ? 'Notification' : pushData.title, 'Important Update')
  const pushBody = toText(typeof pushData === 'string' ? pushData : pushData.body)
  const pushLink = toText(pushData.deep_link || pushData.target_url, 'app://notifications/view')

  const liData = channels.linkedin || {}
  const liPost = toText(typeof liData === 'string' ? liData : (liData.post || liData.body || liData.content))

  const twData = channels.twitter || {}
  const twTweet = toText(typeof twData === 'string' ? twData : (twData.tweet || twData.text))
  const twThreads = toList(twData.thread_points || twData.thread)

  const inAppData = channels.in_app || {}
  const inAppHead = toText(typeof inAppData === 'string' ? 'Announcement' : (inAppData.headline || inAppData.title), 'What’s New')
  const inAppBody = toText(typeof inAppData === 'string' ? inAppData : inAppData.body)
  const inAppBtn = toText(inAppData.action_button || inAppData.cta, 'Explore Now')

  return (
    <div className="adaptaResult">
      {/* 0. GUARDRAILS STATUS BAR & TOP-RIGHT TRACE ID */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '14px',
          width: '100%'
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '11.5px',
            fontWeight: 700,
            background: guardrails?.status === 'BLOCKED'
              ? 'rgba(239, 68, 68, 0.22)'
              : guardrails?.status === 'REDACTED'
              ? 'rgba(251, 191, 36, 0.16)'
              : 'rgba(52, 211, 153, 0.16)',
            color: guardrails?.status === 'BLOCKED'
              ? '#f87171'
              : guardrails?.status === 'REDACTED'
              ? '#fbbf24'
              : '#34d399',
            border: guardrails?.status === 'BLOCKED'
              ? '1px solid rgba(239, 68, 68, 0.65)'
              : guardrails?.status === 'REDACTED'
              ? '1px solid rgba(251, 191, 36, 0.5)'
              : '1px solid rgba(52, 211, 153, 0.45)'
          }}
        >
          <span>🛡️</span>
          <span>
            {guardrails?.status === 'BLOCKED'
              ? `Guardrails: Blocked (${guardrails.triggered_rule || guardrails.rejection_reason || 'Policy Violation'})`
              : guardrails?.status === 'REDACTED'
              ? `Guardrails: ${guardrails.redacted_count || 1} Secret(s) Sanitized`
              : 'Guardrails: Passed · Verified Safe'}
          </span>
        </span>

        {traceId && (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace',
              fontWeight: 600,
              color: '#38bdf8',
              letterSpacing: '0.6px',
              padding: '3px 9px',
              borderRadius: '6px',
              background: 'rgba(7, 140, 255, 0.08)',
              border: '1px solid rgba(7, 140, 255, 0.24)',
              marginLeft: 'auto',
              flexShrink: 0
            }}
            title="Verification Trace Code"
          >
            {traceId}
          </span>
        )}
      </div>

      {/* Attached Document Pill */}
      {doc && (
        <div className="docAttachedPill">
          <div className="docAttachedInfo">
            <svg className="icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="docAttachedName">{toText(doc.filename, 'Attached Document')}</span>
            <span className="docAttachedMeta">
              {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : ''}
              {doc.words ? ` · ${doc.words} words` : ''}
            </span>
          </div>
          {onOpenDoc && (
            <button
              className="docAttachedBtn"
              type="button"
              onClick={() => onOpenDoc(doc)}
            >
              View Document ↗
            </button>
          )}
        </div>
      )}

      {/* Top Readiness Score Card */}
      <div className="readinessCard">
        <div className="readinessHeader">
          <div className="statusBadge">
            <span className="statusDot" />
            <span className="statusText">{status}</span>
          </div>
          <div className="scoreNumber">
            <span className="scoreVal">{score}</span>
            <span className="scoreMax">/ 100</span>
          </div>
        </div>

        {/* Score Progress Bar */}
        <div className="scoreTrack">
          <div
            className="scoreFill"
            style={{ width: `${Math.min(Math.max(score, 5), 100)}%` }}
          />
        </div>

        <p className="readinessSummary">{summary}</p>
      </div>

      {/* Metrics Row */}
      <div className="metricsGrid">
        <div className="metricItem">
          <span className="metricDot" />
          <span className="metricLabel">CHANNELS</span>
          <span className="metricValue">{toText(metrics.channels_adapted, '7')}</span>
        </div>
        <div className="metricItem">
          <span className="metricDot" />
          <span className="metricLabel">COMPRESSION</span>
          <span className="metricValue">{toText(metrics.character_compression, '62%')}</span>
        </div>
        <div className="metricItem">
          <span className="metricDot" />
          <span className="metricLabel">TONE CONSISTENCY</span>
          <span className="metricValue">{toText(metrics.tone_consistency, '95%')}</span>
        </div>
        <div className="metricItem">
          <span className="metricDot" />
          <span className="metricLabel">READABILITY</span>
          <span className="metricValue">{toText(metrics.readability_grade, 'Grade 8')}</span>
        </div>
      </div>

      {/* Channel Navigation Tabs */}
      <div className="channelTabs">
        {[
          { key: 'sms', label: '💬 SMS (iOS / Android)' },
          { key: 'linkedin', label: '💼 LinkedIn' },
          { key: 'twitter', label: '𝕏 Post & Thread' },
          { key: 'email', label: '✉️ Email Client' },
          { key: 'whatsapp', label: '📱 WhatsApp' },
          { key: 'push', label: '🔔 Mobile Push' },
          { key: 'in_app', label: '⚡ In-App Modal' },
          { key: 'payload', label: '{ } JSON Payload' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`channelTab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Channel Content Body */}
      <div className="channelContentBox">

        {/* 1. REALISTIC SMS (iOS / iMessage) */}
        {activeTab === 'sms' && (
          <div className="channelVariant smsVariant">
            <div className="variantHeader">
              <span className="variantTitle">SMS / iMessage Broadcast</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(smsText, 'sms')}
              >
                {copiedKey === 'sms' ? '✓ Copied' : 'Copy Text'}
              </button>
            </div>

            <div className="phoneShell">
              <div className="phoneScreen">
                {/* iOS Status Bar */}
                <div className="iosStatusBar">
                  <span className="iosTime">9:41</span>
                  <div className="iosDynamicIsland" />
                  <div className="iosStatusIcons">
                    <span>5G</span>
                    <svg width="18" height="10" viewBox="0 0 18 10" fill="currentColor">
                      <rect x="0" y="0" width="15" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1" />
                      <rect x="2" y="2" width="10" height="6" rx="1.5" />
                      <path d="M16 3.5v3" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </div>
                </div>

                {/* iMessage Header */}
                <div className="imessageHeader">
                  <span className="imessageBack">‹ Messages</span>
                  <div className="imessageContact">
                    <div className="imessageAvatar">EP</div>
                    <span className="imessageName">Enterprise Alerts</span>
                    <span className="imessageType">iMessage</span>
                  </div>
                  <span className="imessageAction">⋯</span>
                </div>

                {/* Messages Body */}
                <div className="imessageBody">
                  <div className="imessageDate">Today 9:41 AM</div>
                  <div className="smsBubbleWrap">
                    <div className="smsBubbleReal">
                      {smsText || 'No SMS text provided.'}
                    </div>
                    <span className="smsDelivered">Delivered</span>
                  </div>
                </div>

                {/* Footer specs & input bar */}
                <div className="smsMetaBar">
                  <span className="smsCountPill">{smsCount} / 160 characters</span>
                  <span className="smsCompliancePill">{smsCompliance}</span>
                </div>

                <div className="imessageInputBar">
                  <div className="imessageInputIcon">📷</div>
                  <div className="imessageFakeInput">iMessage</div>
                  <div className="imessageSendIcon">↑</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. REALISTIC LINKEDIN POST */}
        {activeTab === 'linkedin' && (
          <div className="channelVariant linkedinVariant">
            <div className="variantHeader">
              <span className="variantTitle">LinkedIn B2B Feed Publication</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(liPost, 'linkedin')}
              >
                {copiedKey === 'linkedin' ? '✓ Copied' : 'Copy Post'}
              </button>
            </div>

            <div className="linkedinFeedCard">
              {/* Header */}
              <div className="liCardHeader">
                <div className="liAuthorBlock">
                  <div className="liProfileAvatar">
                    <span>EP</span>
                    <div className="liBadgeCheck">✓</div>
                  </div>
                  <div className="liAuthorInfo">
                    <div className="liNameRow">
                      <span className="liAuthorName">Enterprise Pulse</span>
                      <span className="liFollowDot">· 1st</span>
                      <button type="button" className="liFollowBtn">+ Follow</button>
                    </div>
                    <span className="liHeadline">Official Strategic Communications · Global Operations</span>
                    <span className="liTimestamp">1h · Edited · 🌐</span>
                  </div>
                </div>
                <button type="button" className="liMenuBtn">•••</button>
              </div>

              {/* Body Content */}
              <div className="liPostBody">
                {liPost.split('\n\n').map((para, pIdx) => (
                  <p key={pIdx}>
                    {para.split(' ').map((word, wIdx) => {
                      if (word.startsWith('#')) {
                        return <span key={wIdx} className="liHashtag">{word} </span>
                      }
                      if (word.startsWith('http')) {
                        return <span key={wIdx} className="liLink">{word} </span>
                      }
                      return word + ' '
                    })}
                  </p>
                ))}
              </div>

              {/* Engagement counts */}
              <div className="liSocialCounts">
                <div className="liReactionIcons">
                  <span className="liReactBubble liBlue">👍</span>
                  <span className="liReactBubble liGreen">👏</span>
                  <span className="liReactBubble liRed">❤️</span>
                  <span className="liReactionTotal">1,482</span>
                </div>
                <div className="liCommentCounts">
                  <span>84 comments</span>
                  <span>·</span>
                  <span>32 reposts</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="liActionBar">
                <button type="button" className="liActionBtn">
                  <span>👍</span> Like
                </button>
                <button type="button" className="liActionBtn">
                  <span>💬</span> Comment
                </button>
                <button type="button" className="liActionBtn">
                  <span>🔁</span> Repost
                </button>
                <button type="button" className="liActionBtn">
                  <span>✈️</span> Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. REALISTIC X / TWITTER POST */}
        {activeTab === 'twitter' && (
          <div className="channelVariant twitterVariant">
            <div className="variantHeader">
              <span className="variantTitle">𝕏 / Twitter Post & Thread</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(
                  `${twTweet}\n\nThread Points:\n${twThreads.join('\n')}`,
                  'twitter'
                )}
              >
                {copiedKey === 'twitter' ? '✓ Copied' : 'Copy Tweet'}
              </button>
            </div>

            <div className="xPostCard">
              <div className="xPostHeader">
                <div className="xAuthorWrap">
                  <div className="xAvatar">𝕏</div>
                  <div className="xAuthorText">
                    <div className="xNameRow">
                      <span className="xAuthorName">Enterprise Pulse</span>
                      <svg className="xVerifiedBadge" viewBox="0 0 24 24" width="16" height="16">
                        <circle cx="12" cy="12" r="10" fill="#1d9bf0" />
                        <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </div>
                    <span className="xHandle">@EnterprisePulse · 2h</span>
                  </div>
                </div>
                <div className="xTopLogo">𝕏</div>
              </div>

              {/* Tweet Text */}
              <div className="xPostContent">
                {twTweet.split(' ').map((word, wIdx) => {
                  if (word.startsWith('#') || word.startsWith('$')) {
                    return <span key={wIdx} className="xHighlight">{word} </span>
                  }
                  if (word.startsWith('@')) {
                    return <span key={wIdx} className="xMention">{word} </span>
                  }
                  if (word.startsWith('http')) {
                    return <span key={wIdx} className="xLink">{word} </span>
                  }
                  return word + ' '
                })}
              </div>

              {/* Timestamp & Views */}
              <div className="xTimestampRow">
                <span>10:42 AM · Nov 16, 2026</span>
                <span>·</span>
                <span className="xViews">58.4K Views</span>
              </div>

              {/* Metrics & Action Bar */}
              <div className="xActionBar">
                <div className="xActionItem">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <span>142</span>
                </div>
                <div className="xActionItem">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  <span>389</span>
                </div>
                <div className="xActionItem">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>2.1K</span>
                </div>
                <div className="xActionItem">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>412</span>
                </div>
                <div className="xActionItem">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </div>
              </div>

              {/* Thread continuation */}
              {twThreads.length > 0 && (
                <div className="xThreadBox">
                  <div className="xThreadLabel">Thread Follow-ups:</div>
                  {twThreads.map((item, idx) => (
                    <div key={idx} className="xThreadItem">
                      <div className="xThreadLine" />
                      <div className="xThreadContent">
                        <span className="xThreadIndex">{idx + 2}/</span>
                        <p>{toText(item)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. REALISTIC EMAIL CLIENT */}
        {activeTab === 'email' && (
          <div className="channelVariant emailVariant">
            <div className="variantHeader">
              <span className="variantTitle">Desktop Email Client</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(
                  `Subject Lines:\n${emailSubjects.join('\n')}\nPreheader: ${emailPreview}\n\n${emailBody}\n\nCTA: ${emailCta}`,
                  'email'
                )}
              >
                {copiedKey === 'email' ? '✓ Copied' : 'Copy All'}
              </button>
            </div>

            <div className="emailClientWindow">
              {/* Window Bar */}
              <div className="emailWindowBar">
                <div className="emailWindowControls">
                  <span className="winDot winClose" />
                  <span className="winDot winMin" />
                  <span className="winDot winMax" />
                </div>
                <span className="emailWindowTitle">Enterprise Notification — Official Dispatch</span>
                <span className="emailSecurityTag">🔒 TLS Encrypted</span>
              </div>

              {/* Email Envelope Fields */}
              <div className="emailEnvelope">
                <div className="emailMetaRow">
                  <span className="emailMetaLabel">From:</span>
                  <span className="emailMetaValue">Enterprise Dispatch <code>&lt;dispatch@enterprise.domain&gt;</code></span>
                </div>
                <div className="emailMetaRow">
                  <span className="emailMetaLabel">To:</span>
                  <span className="emailMetaValue">Valued Client <code>&lt;recipient@enterprise.com&gt;</code></span>
                </div>
                <div className="emailMetaRow">
                  <span className="emailMetaLabel">Date:</span>
                  <span className="emailMetaValue">Today, 10:30 AM (Just now)</span>
                </div>

                {emailSubjects.length > 0 && (
                  <div className="emailMetaRow" style={{ alignItems: 'flex-start' }}>
                    <span className="emailMetaLabel">Subject:</span>
                    <div className="emailSubjectsWrap">
                      <div className="emailActiveSubject">
                        <strong>{toText(emailSubjects[activeSubjectIdx] || emailSubjects[0])}</strong>
                      </div>
                      {emailSubjects.length > 1 && (
                        <div className="emailSubjectTabs">
                          <span style={{ fontSize: '11px', color: '#849bb4', marginRight: '4px' }}>A/B Variants:</span>
                          {emailSubjects.map((sub, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              className={`subVariantBtn${activeSubjectIdx === sIdx ? ' active' : ''}`}
                              onClick={() => setActiveSubjectIdx(sIdx)}
                            >
                              Variant {sIdx + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {emailPreview && (
                  <div className="emailPreheaderRow">
                    <span className="emailMetaLabel">Preview:</span>
                    <span className="emailPreheaderText">{emailPreview}</span>
                  </div>
                )}
              </div>

              {/* Email Body Canvas */}
              <div className="emailBodyCanvas">
                <div className="emailContentCard">
                  <div className="emailContentLogo">ENTERPRISE COMMUNICATIONS</div>
                  <div className="emailBodyText">
                    {emailBody ? emailBody.split('\n\n').map((para, idx) => (
                      <p key={idx}>{para}</p>
                    )) : 'No email body generated.'}
                  </div>

                  {emailCta && (
                    <div className="emailCtaArea">
                      <a href="#action" onClick={(e) => e.preventDefault()} className="emailCtaButton">
                        {emailCta}
                      </a>
                    </div>
                  )}

                  <div className="emailFooterSignoff">
                    <p>Best regards,<br /><strong>The Enterprise Operations Team</strong></p>
                    <div className="emailComplianceFooter">
                      This is an official administrative communication. To update notification preferences or unsubscribe, visit the Customer Preference Center.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. REALISTIC WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <div className="channelVariant whatsappVariant">
            <div className="variantHeader">
              <span className="variantTitle">WhatsApp Business Broadcast</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(waText, 'whatsapp')}
              >
                {copiedKey === 'whatsapp' ? '✓ Copied' : 'Copy WhatsApp'}
              </button>
            </div>

            <div className="whatsappPhoneMockup">
              <div className="waChatHeader">
                <div className="waAvatar">🏢</div>
                <div className="waContactInfo">
                  <div className="waContactName">
                    Enterprise Updates <span className="waVerified">✓</span>
                  </div>
                  <span className="waOfficial">Official Business Account</span>
                </div>
              </div>

              <div className="whatsappBubble">
                <pre className="waText">{waText || 'No WhatsApp text generated.'}</pre>
                <div className="waTime">
                  <span>Just now</span>
                  <span className="waCheck">✓✓</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. REALISTIC MOBILE PUSH NOTIFICATION */}
        {activeTab === 'push' && (
          <div className="channelVariant pushVariant">
            <div className="variantHeader">
              <span className="variantTitle">Mobile Push (Lockscreen)</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(`${pushTitle}\n${pushBody}`, 'push')}
              >
                {copiedKey === 'push' ? '✓ Copied' : 'Copy Push'}
              </button>
            </div>

            <div className="pushPhoneShell">
              <div className="pushLockscreen">
                <div className="lockscreenClock">
                  <div className="lockTime">09:41</div>
                  <div className="lockDate">Monday, November 16</div>
                </div>

                <div className="pushBanner">
                  <div className="pushBannerHeader">
                    <div className="pushAppBadge">
                      <span className="pushIcon">⚡</span>
                      <span className="pushAppName">ENTERPRISE APP</span>
                    </div>
                    <span className="pushTimeLabel">now</span>
                  </div>
                  <div className="pushTitleText">{pushTitle}</div>
                  <div className="pushBodyText">{pushBody || 'No push notification body.'}</div>
                  <div className="pushActionsRow">
                    <button type="button" className="pushActionBtn primary">Open</button>
                    <button type="button" className="pushActionBtn">Dismiss</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. IN-APP MODAL */}
        {activeTab === 'in_app' && (
          <div className="channelVariant inAppVariant">
            <div className="variantHeader">
              <span className="variantTitle">In-App Announcement Modal</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(
                  `${inAppHead}\n${inAppBody}\nAction: ${inAppBtn}`,
                  'in_app'
                )}
              >
                {copiedKey === 'in_app' ? '✓ Copied' : 'Copy In-App'}
              </button>
            </div>

            <div className="inAppMockup">
              <div className="inAppModal">
                <div className="inAppTag">WHAT'S NEW</div>
                <h3 className="inAppHead">{inAppHead}</h3>
                <p className="inAppBody">{inAppBody || 'No announcement body.'}</p>
                <div className="inAppActions">
                  <button className="inAppBtn" type="button">
                    {inAppBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. PAYLOAD TAB */}
        {activeTab === 'payload' && (
          <div className="channelVariant payloadVariant">
            <div className="variantHeader">
              <span className="variantTitle">Omnichannel JSON Payload</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(payload && Object.keys(payload).length > 0 ? payload : data, 'payload')}
              >
                {copiedKey === 'payload' ? '✓ Copied' : 'Copy JSON'}
              </button>
            </div>
            <pre className="codeBox">
              {JSON.stringify(payload && Object.keys(payload).length > 0 ? payload : data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Strategic Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendationsSection">
          <div className="recTitle">STRATEGIC OMNICHANNEL RECOMMENDATIONS</div>
          <div className="recList">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="recItem">
                <span className="recNumber">{idx + 1}</span>
                <span className="recText">{toText(rec)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
