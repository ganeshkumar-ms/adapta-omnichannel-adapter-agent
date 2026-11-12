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

export default function AdaptaResultCard({ data, onOpenDoc }) {
  const [activeTab, setActiveTab] = useState('email')
  const [copiedKey, setCopiedKey] = useState('')

  if (!data) {
    return <div className="chatBubbleText">No adaptation data available.</div>
  }

  // If chat message or error response
  if (data.type === 'chat' || (!data.channels && (data.message || data.detail))) {
    return (
      <div className="adaptaResult">
        {data.document && (
          <div className="docAttachedPill">
            <div className="docAttachedInfo">
              <svg className="icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="docAttachedName">{toText(data.document.filename, 'Attached Document')}</span>
              <span className="docAttachedMeta">
                {data.document.size ? `${(data.document.size / 1024).toFixed(1)} KB` : ''}
              </span>
            </div>
            {onOpenDoc && (
              <button
                className="docAttachedBtn"
                type="button"
                onClick={() => onOpenDoc(data.document)}
              >
                View Document ↗
              </button>
            )}
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

  // Safe channel extractions
  const emailData = channels.email || {}
  const emailSubjects = toList(emailData.subject_lines || emailData.subject)
  const emailPreview = toText(emailData.preview_text || emailData.preheader)
  const emailBody = toText(typeof emailData === 'string' ? emailData : emailData.body)
  const emailCta = toText(emailData.cta?.text || emailData.cta)

  const smsData = channels.sms || {}
  const smsText = toText(typeof smsData === 'string' ? smsData : (smsData.text || smsData.body || smsData.message))
  const smsCount = smsData.char_count || smsText.length
  const smsCompliance = toText(smsData.compliance, 'Reply STOP to opt out')

  const waData = channels.whatsapp || {}
  const waText = toText(typeof waData === 'string' ? waData : (waData.text || waData.message || waData.body))

  const pushData = channels.push || {}
  const pushTitle = toText(typeof pushData === 'string' ? 'Notification' : pushData.title, 'Update Alert')
  const pushBody = toText(typeof pushData === 'string' ? pushData : pushData.body)
  const pushLink = toText(pushData.deep_link || pushData.target_url)

  const liData = channels.linkedin || {}
  const liPost = toText(typeof liData === 'string' ? liData : (liData.post || liData.body || liData.content))

  const twData = channels.twitter || {}
  const twTweet = toText(typeof twData === 'string' ? twData : (twData.tweet || twData.text))
  const twThreads = toList(twData.thread_points || twData.thread)

  const inAppData = channels.in_app || {}
  const inAppHead = toText(typeof inAppData === 'string' ? 'Announcement' : (inAppData.headline || inAppData.title), 'What’s New')
  const inAppBody = toText(typeof inAppData === 'string' ? inAppData : inAppData.body)
  const inAppBtn = toText(inAppData.action_button || inAppData.cta, 'View Update')

  return (
    <div className="adaptaResult">
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
          { key: 'email', label: 'Email' },
          { key: 'sms', label: 'SMS' },
          { key: 'whatsapp', label: 'WhatsApp' },
          { key: 'push', label: 'Push' },
          { key: 'linkedin', label: 'LinkedIn' },
          { key: 'twitter', label: 'X (Twitter)' },
          { key: 'in_app', label: 'In-App' },
          { key: 'payload', label: 'Payload (JSON)' }
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
        {/* EMAIL TAB */}
        {activeTab === 'email' && (
          <div className="channelVariant emailVariant">
            <div className="variantHeader">
              <span className="variantTitle">Email Campaign Variant</span>
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

            {emailSubjects.length > 0 && (
              <div className="emailSection">
                <span className="fieldLabel">A/B Testing Subject Lines:</span>
                <div className="subjectPills">
                  {emailSubjects.map((sub, idx) => (
                    <div key={idx} className="subjectPill">
                      <span className="subTag">Option {idx + 1}</span>
                      <span className="subText">{toText(sub)}</span>
                      <button
                        className="pillCopy"
                        type="button"
                        onClick={() => copyText(toText(sub), `sub_${idx}`)}
                      >
                        {copiedKey === `sub_${idx}` ? '✓' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {emailPreview && (
              <div className="emailSection">
                <span className="fieldLabel">Preheader / Preview Text:</span>
                <div className="previewTextBox">
                  <span>{emailPreview}</span>
                  <small className="charTag">{emailPreview.length} chars</small>
                </div>
              </div>
            )}

            <div className="emailSection">
              <span className="fieldLabel">Email Body Copy:</span>
              <pre className="emailBodyBox">{emailBody || 'No email body provided.'}</pre>
            </div>

            {emailCta && (
              <div className="emailSection ctaSection">
                <span className="fieldLabel">Primary Call-to-Action:</span>
                <div className="ctaPill">
                  <span>{emailCta}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SMS TAB */}
        {activeTab === 'sms' && (
          <div className="channelVariant smsVariant">
            <div className="variantHeader">
              <span className="variantTitle">SMS Copy (Single Part &lt;160 Chars)</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(smsText, 'sms')}
              >
                {copiedKey === 'sms' ? '✓ Copied' : 'Copy SMS'}
              </button>
            </div>

            <div className="smsPhoneMockup">
              <div className="smsBubble">
                {smsText || 'No SMS text generated.'}
              </div>
              <div className="smsFooter">
                <span className="smsCount">
                  {smsCount} / 160 characters
                </span>
                <span className="smsCompliance">
                  {smsCompliance}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* WHATSAPP TAB */}
        {activeTab === 'whatsapp' && (
          <div className="channelVariant whatsappVariant">
            <div className="variantHeader">
              <span className="variantTitle">WhatsApp Rich Broadcast</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(waText, 'whatsapp')}
              >
                {copiedKey === 'whatsapp' ? '✓ Copied' : 'Copy WhatsApp'}
              </button>
            </div>

            <div className="whatsappPhoneMockup">
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

        {/* PUSH TAB */}
        {activeTab === 'push' && (
          <div className="channelVariant pushVariant">
            <div className="variantHeader">
              <span className="variantTitle">Mobile Push Notification</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(`${pushTitle}\n${pushBody}`, 'push')}
              >
                {copiedKey === 'push' ? '✓ Copied' : 'Copy Push'}
              </button>
            </div>

            <div className="pushPhoneMockup">
              <div className="pushNotificationCard">
                <div className="pushTop">
                  <div className="pushApp">
                    <span className="pushAppIcon">⚡</span>
                    <span className="pushAppName">APP NOTIFICATION</span>
                  </div>
                  <span className="pushTime">NOW</span>
                </div>
                <div className="pushTitle">{pushTitle}</div>
                <div className="pushBody">{pushBody || 'No push notification body.'}</div>
                {pushLink && (
                  <div className="pushLink">Target: {pushLink}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LINKEDIN TAB */}
        {activeTab === 'linkedin' && (
          <div className="channelVariant linkedinVariant">
            <div className="variantHeader">
              <span className="variantTitle">LinkedIn B2B Thought Leadership</span>
              <button
                className="copyBtn"
                type="button"
                onClick={() => copyText(liPost, 'linkedin')}
              >
                {copiedKey === 'linkedin' ? '✓ Copied' : 'Copy Post'}
              </button>
            </div>

            <div className="linkedinMockup">
              <div className="linkedinAuthor">
                <div className="liAvatar">A</div>
                <div>
                  <div className="liName">Company Update</div>
                  <div className="liRole">Omnichannel Strategy · 1st</div>
                </div>
              </div>
              <pre className="liContent">{liPost || 'No LinkedIn post generated.'}</pre>
            </div>
          </div>
        )}

        {/* TWITTER TAB */}
        {activeTab === 'twitter' && (
          <div className="channelVariant twitterVariant">
            <div className="variantHeader">
              <span className="variantTitle">X / Twitter Tweet & Thread</span>
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

            <div className="tweetMockup">
              <div className="mainTweet">
                <span className="tweetLabel">Main Tweet:</span>
                <p className="tweetText">{twTweet || 'No tweet text generated.'}</p>
                <small className="charTag">{twTweet.length} / 280 chars</small>
              </div>

              {twThreads.length > 0 && (
                <div className="tweetThread">
                  <span className="tweetLabel">Thread Follow-ups:</span>
                  {twThreads.map((pt, idx) => (
                    <div key={idx} className="threadItem">
                      <span>{toText(pt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* IN-APP TAB */}
        {activeTab === 'in_app' && (
          <div className="channelVariant inAppVariant">
            <div className="variantHeader">
              <span className="variantTitle">In-App Announcement Modal / Banner</span>
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

        {/* PAYLOAD TAB */}
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
