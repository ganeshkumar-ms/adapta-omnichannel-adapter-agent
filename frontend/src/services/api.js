const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function adaptMessage({ file, text, conversationHistory = [] }) {
  const formData = new FormData()
  if (file) {
    formData.append('file', file)
  }
  if (text) {
    formData.append('text', text)
  }
  formData.append('conversation_history', JSON.stringify(conversationHistory))

  const url = `${API_BASE}/api/adapt`
  const res = await fetch(url, {
    method: 'POST',
    body: formData
  })

  const textResp = await res.text()
  let data
  try {
    data = JSON.parse(textResp)
  } catch (e) {
    if (textResp.trim().startsWith('<!doctype') || textResp.trim().startsWith('<html')) {
      throw new Error(`CloudFront/API Gateway returned HTML (${res.status}). Verify API routing.`)
    }
    throw new Error(`Invalid server response (${res.status}): ${textResp.slice(0, 150)}`)
  }

  if (!res.ok) {
    throw new Error(data.detail || data.message || `Request failed (${res.status})`)
  }

  return data
}

export function toViewerDoc(meta) {
  if (!meta) return null
  return {
    name: meta.filename || meta.name || 'Document',
    viewUrl: meta.view_url
      ? (meta.view_url.startsWith('http') ? meta.view_url : `${API_BASE}${meta.view_url}`)
      : null,
    downloadUrl: meta.url
      ? (meta.url.startsWith('http') ? meta.url : `${API_BASE}${meta.url}`)
      : null,
    preview: meta.preview || '',
    rawMeta: meta
  }
}

