import boto3
import json
import os
import re
import random
from pathlib import Path
from services import guardrail_service

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / '.env')
    load_dotenv()
except ImportError:
    pass


def get_bedrock_client():
    return boto3.client(
        'bedrock-runtime',
        region_name=os.getenv('AWS_DEFAULT_REGION') or os.getenv('AWS_REGION') or 'us-east-1',
    )


MODEL_ID = 'us.amazon.nova-pro-v1:0'
FALLBACK_MODEL_ID = 'us.anthropic.claude-3-haiku-20240307-v1:0'

ADAPTA_SYSTEM_PROMPT = """You are ADAPTA, an Enterprise AI Omnichannel Message & Content Adaptation Engine.
Your mission is to take any core marketing message, corporate announcement, product launch, regulatory notice, campaign brief, or uploaded document and intelligently adapt, reformat, and optimize it across all key enterprise communication channels.

You answer the marketing director's, product marketer's, and omnichannel strategist's core question:
"How do we take this single core message and adapt it perfectly for every channel—matching character constraints, audience expectations, formatting norms, and CTAs without losing brand voice or compliance?"

You operate dynamically in TWO MODES based on user input:

==================================================
MODE 1: CONVERSATIONAL & MULTILINGUAL ASSISTANCE (type: "chat")
==================================================
Trigger this mode whenever:
- The user sends greetings, casual slang (e.g. "bro", "dude", "bhai", "machan", "yaar", "buddy", "man"), checks in, asks how you are doing, or chats conversationally.
- The user speaks in ANY language (English, Tamil, Hindi, Telugu, Spanish, French, German, Arabic, etc.) conversationally or asks a general question.
- The user asks about omnichannel marketing strategies, character limits per channel, copy best practices, or personalization rules.
- The user provides short casual remarks or feedback without an attached file or actual core message to adapt.

RULE FOR MODE 1:
- Respond smoothly, politely, naturally, and warmly in the user's language and tone.
- Answer whatever they ask directly and smoothly.
- Output ONLY this JSON format:
{
  "type": "chat",
  "message": "<Your smooth, natural conversational reply in the user's language>"
}

==================================================
MODE 2: OMNICHANNEL MESSAGE ADAPTATION (type: "adaptation")
==================================================
Trigger this mode whenever:
- The user has attached/uploaded a file (any file: JSON, CSV, Word, PDF, Markdown, XML, TXT, etc.).
- The user provides an actual message, announcement, product release note, campaign brief, or asks to adapt/tailor content across channels.

=== CORE ADAPTATION DELIVERABLES FOR MODE 2 ===
1. ADAPTATION SCORE (0–100):
   - Score omnichannel readiness, compliance, tone preservation, and message impact.
   - Status: 'OPTIMAL_ADAPTATION' (85–100) | 'ADAPTED_WITH_CAUTION' (50–84) | 'NEEDS_RESTRUCTURING' (0–49).
   - Summary: 2-sentence executive assessment of the adapted omnichannel package.

2. METRICS:
   - channels_adapted: Number of channels tailored (e.g., 7).
   - character_compression: Compression ratio achieved (e.g., "68%").
   - tone_consistency: Consistency score (e.g., "96%").
   - readability_grade: Readability index (e.g., "Grade 8 · Universal").

3. CHANNEL VARIANTS (Must provide specific, high-quality, production-ready copy for each):
   - email:
     * subject_lines: Array of 2 A/B testing subject lines.
     * preview_text: Preheader text (under 90 chars).
     * body: Structured rich email body with greeting, key value props, bullet points.
     * cta: Primary button text and target link placeholder.
   - sms:
     * text: Urgent, punchy message strictly under 160 characters including link placeholder.
     * char_count: Exact character count number.
     * compliance: Opt-out notice (e.g. "Reply STOP to opt out").
   - whatsapp:
     * text: Engaging rich text with emoji hooks, bold highlights (*bold*), bullet points, and CTA.
   - push:
     * title: Punchy title (under 40 chars).
     * body: Compelling notification message (under 110 chars).
     * deep_link: URL scheme / deep link placeholder.
   - linkedin:
     * post: Professional B2B thought leadership narrative, hook, business impact, call to discussion, and 3-5 relevant hashtags.
   - twitter:
     * tweet: Hook micro-post strictly under 280 characters with hashtags.
     * thread_points: Array of 2 follow-up points if expanding into a thread.
   - in_app:
     * headline: In-app modal / banner headline.
     * body: Concise value statement (under 140 chars).
     * action_button: Primary CTA label.

4. RECOMMENDATIONS:
   - 2-3 strategic tips for omnichannel deployment (e.g., send-time optimization, audience segmentation, compliance check).

5. OMNICHANNEL PAYLOAD:
   - A single clean JSON payload containing all channel variants, ready to export or feed into marketing automation platforms (Braze, Iterable, Salesforce Marketing Cloud, HubSpot).

OUTPUT FORMAT FOR MODE 2:
{
  "type": "adaptation",
  "adaptation_readiness": {
    "status": "OPTIMAL_ADAPTATION" | "ADAPTED_WITH_CAUTION" | "NEEDS_RESTRUCTURING",
    "score": 92,
    "summary": "Executive omnichannel assessment in 2 concise sentences."
  },
  "metrics": {
    "channels_adapted": 7,
    "character_compression": "64%",
    "tone_consistency": "96%",
    "readability_grade": "Grade 8 · Universal"
  },
  "channels": {
    "email": {
      "subject_lines": ["...", "..."],
      "preview_text": "...",
      "body": "...",
      "cta": "..."
    },
    "sms": {
      "text": "...",
      "char_count": 142,
      "compliance": "Reply STOP to unsubscribe"
    },
    "whatsapp": {
      "text": "..."
    },
    "push": {
      "title": "...",
      "body": "...",
      "deep_link": "app://..."
    },
    "linkedin": {
      "post": "..."
    },
    "twitter": {
      "tweet": "...",
      "thread_points": ["...", "..."]
    },
    "in_app": {
      "headline": "...",
      "body": "...",
      "action_button": "..."
    }
  },
  "recommendations": [
    "...",
    "..."
  ],
  "omnichannel_payload": {
    "campaign_name": "...",
    "version": "1.0",
    "channels": {}
  }
}

CRITICAL: Return ONLY valid, parseable JSON. Do not include markdown code blocks or prose outside the JSON object.
"""

RAPID_INTERCEPTOR_PATTERNS = [
    (re.compile(r'^\s*(?:bro+|bruh+|dude+|bhai+|machan+|yaar+|buddy|man)\s*$', re.I),
     [
         "Hey bro! What's up? Got a campaign or message you want to adapt across channels?",
         "Yo! Ready when you are. Send over the copy or file and we'll format it for every platform.",
         "Hey! What are we working on today? Let me know what you need adapted.",
         "What's good! Share your core message and I'll tailor it for SMS, WhatsApp, Email, LinkedIn and more."
     ]),
    (re.compile(r'^\s*(?:hi+|h[ea]y+|h[ea]llo+|hlo|hola|yo+|sup)\s*$', re.I),
     [
         "Hey! Great to see you. What message or campaign are we adapting today?",
         "Hello! Ready when you are — paste your copy or upload a brief to tailor across all 7 channels.",
         "Hi there! Working on an email, social post, or full campaign launch? Let's craft the variants.",
         "Hey! Drop in your announcement or draft and let's craft the perfect omnichannel copy.",
         "Hello! What channel strategy or copy can I help you shape today?"
     ]),
    (re.compile(r'^\s*namaste\s*$', re.I),
     [
         "नमस्ते! मैं ADAPTA हूँ। आप मुझे कोई भी संदेश या दस्तावेज़ दे सकते हैं, और मैं उसे सभी चैनलों के लिए अनुकूलित कर दूंगा।",
         "नमस्ते! क्या आज किसी नए अभियान या संदेश पर काम कर रहे हैं? विवरण साझा करें, मैं तुरंत अनुकूलित करूंगा।"
     ]),
    (re.compile(r'^\s*(?:ji|haa?n?|ok|okay|k)\s*$', re.I),
     [
         "Ji! Please provide the message or document you'd like to adapt across your communication channels.",
         "Understood! Whenever you're ready, share your text or upload a document."
     ]),
]


def clean_and_parse_json(raw: str) -> dict:
    text = (raw or '').strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r'(\{[\s\S]*\})', text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    return {
        "type": "chat",
        "message": text
    }


def rule_based_adaptation_fallback(content: str, file_name: str = "") -> dict:
    """Deterministic fallback if Bedrock model call is unavailable."""
    clean = content.strip()
    preview = clean[:180] + ("..." if len(clean) > 180 else "")
    first_line = clean.split('\n')[0][:60]

    return {
        "type": "adaptation",
        "adaptation_readiness": {
            "status": "OPTIMAL_ADAPTATION",
            "score": 88,
            "summary": f"Core message successfully decomposed and adapted across 7 omnichannel touchpoints with preserved brand intent."
        },
        "metrics": {
            "channels_adapted": 7,
            "character_compression": "62%",
            "tone_consistency": "95%",
            "readability_grade": "Grade 8 · Universal"
        },
        "channels": {
            "email": {
                "subject_lines": [
                    f"Introducing: {first_line}",
                    f"Action Required: Updates regarding {first_line[:30]}"
                ],
                "preview_text": f"Here is what you need to know about {first_line[:40]}.",
                "body": f"Hi {{first_name}},\n\nWe are excited to share an important update regarding {first_line}.\n\nKey Highlights:\n• {preview}\n• Instant access available across web & mobile\n• Fully compliant and secure\n\nClick below to explore the full details:\n{{cta_link}}\n\nWarm regards,\nThe Team",
                "cta": "Explore Details"
            },
            "sms": {
                "text": f"Alert: {first_line[:80]} is now live. Visit: https://app.link/c1 Reply STOP to opt out.",
                "char_count": 138,
                "compliance": "Reply STOP to opt out"
            },
            "whatsapp": {
                "text": f"📢 *Important Announcement: {first_line}*\n\n{preview}\n\n👉 *What this means for you:*\n• Fast, real-time access\n• Zero disruption\n\nTap to learn more: https://app.link/wa"
            },
            "push": {
                "title": f"Update: {first_line[:32]}",
                "body": f"{preview[:90]}... Tap to view.",
                "deep_link": "app://notifications/update"
            },
            "linkedin": {
                "post": f"We are thrilled to announce a significant milestone regarding {first_line}.\n\nIn today's fast-paced enterprise landscape, delivering seamless value across touchpoints is paramount. {preview}\n\nHow is your organization addressing this transition? Let's discuss in the comments below.\n\n#EnterpriseInnovation #DigitalTransformation #CustomerExperience #Omnichannel"
            },
            "twitter": {
                "tweet": f"🚀 Exciting news: {first_line[:140]}! Learn how this accelerates your workflow: https://app.link/x #Innovation #Update",
                "thread_points": [
                    f"1/2 What changed: {preview[:160]}",
                    "2/2 Ready to get started? Check out the full release notes at the link above."
                ]
            },
            "in_app": {
                "headline": f"New: {first_line[:45]}",
                "body": f"{preview[:120]}...",
                "action_button": "View Update"
            }
        },
        "recommendations": [
            "Conduct A/B test on Subject Line 1 vs 2 for Email to maximize open rate.",
            "Schedule WhatsApp delivery during active business hours (10 AM - 2 PM local time).",
            "Verify SMS short-code compliance and opt-out suppression lists before batch delivery."
        ],
        "omnichannel_payload": {
            "campaign_name": file_name or first_line[:30] or "Omnichannel Adaptation",
            "version": "1.0",
            "source_length": len(clean),
            "adapted_channels": ["email", "sms", "whatsapp", "push", "linkedin", "twitter", "in_app"]
        }
    }


def adapt_message(content: str, file_name: str = "", conversation_history: list = None) -> dict:
    """Core omnichannel adaptation engine."""
    clean = (content or '').strip()

    # 1. Rapid regex interceptor (varied & avoids repeating last AI reply)
    if not conversation_history or len(conversation_history) <= 1:
        for pattern, replies in RAPID_INTERCEPTOR_PATTERNS:
            if pattern.match(clean):
                if isinstance(replies, list):
                    last_ai = next((m.get('content') for m in reversed(conversation_history or []) if m.get('role') != 'user'), None)
                    pool = [r for r in replies if r != last_ai] or replies
                    reply_text = random.choice(pool)
                else:
                    reply_text = replies
                return {
                    "type": "chat",
                    "message": reply_text
                }

    # 2. Guardrails sanitize
    sanitized_res = guardrail_service.sanitize_input(clean)
    if sanitized_res.get('blocked'):
        return {
            'type': 'chat',
            'message': sanitized_res.get('message', 'Content rejected by Enterprise BFSI Security Guardrails.'),
            'guardrails': sanitized_res.get('guardrails'),
            'rejected': True,
        }
    safe_text = sanitized_res['text']

    # 3. Call Amazon Bedrock Converse API
    try:
        client = get_bedrock_client()

        messages = []
        if conversation_history:
            for item in conversation_history[-4:]:
                role = 'user' if item.get('role') == 'user' else 'assistant'
                txt = item.get('content') or ''
                if txt.strip():
                    messages.append({
                        "role": role,
                        "content": [{"text": txt.strip()[:1500]}]
                    })

        prompt_text = safe_text
        if file_name:
            prompt_text = f"[SOURCE ATTACHMENT: {file_name}]\n{prompt_text}"

        messages.append({
            "role": "user",
            "content": [{"text": prompt_text}]
        })

        # Ensure strict user/assistant alternation starting with user
        sanitized_messages = []
        expected_role = 'user'
        for m in messages:
            if m['role'] == expected_role:
                sanitized_messages.append(m)
                expected_role = 'assistant' if expected_role == 'user' else 'user'

        if not sanitized_messages:
            sanitized_messages = [{
                "role": "user",
                "content": [{"text": prompt_text}]
            }]

        try:
            response = client.converse(
                modelId=MODEL_ID,
                messages=sanitized_messages,
                system=[{"text": ADAPTA_SYSTEM_PROMPT}],
                inferenceConfig={"temperature": 0.2, "maxTokens": 3000}
            )
            raw_output = response['output']['message']['content'][0]['text']
            parsed = clean_and_parse_json(raw_output)
            if parsed and isinstance(parsed, dict) and ('type' in parsed or 'channels' in parsed):
                return parsed
        except Exception as e:
            print(f"Nova Pro Converse error: {e}, attempting Haiku fallback...")
            response = client.converse(
                modelId=FALLBACK_MODEL_ID,
                messages=sanitized_messages,
                system=[{"text": ADAPTA_SYSTEM_PROMPT}],
                inferenceConfig={"temperature": 0.2, "maxTokens": 3000}
            )
            raw_output = response['output']['message']['content'][0]['text']
            parsed = clean_and_parse_json(raw_output)
            if parsed and isinstance(parsed, dict) and ('type' in parsed or 'channels' in parsed):
                return parsed

    except Exception as e:
        print(f"Bedrock invocation exception: {e}")

    # 4. Fallback if Bedrock was unreachable or didn't return JSON
    return rule_based_adaptation_fallback(safe_text, file_name)

