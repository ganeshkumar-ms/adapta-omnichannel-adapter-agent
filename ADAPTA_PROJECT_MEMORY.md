# ADAPTA — Project Memory & Technical Architecture

## 1. Executive Summary
- **Agent Name**: ADAPTA
- **Agent Index**: Agent #7 of the 10-Agent Content Intelligence Platform (`CLARIA · LENS · INDEX · BRIDGE · GRID · ADAPTA · GLANCE · SORTIA · ECHO · ALLY`)
- **Category**: Omnichannel Message & Content Adaptation Engine
- **AWS Account ID**: `984625844016`
- **Region**: `us-east-1`
- **Live CloudFront Distribution**: `https://d36ns0rvegxqlv.cloudfront.net` (Distribution ID: `EIVPKRDHHUHPC`)
- **API Gateway Endpoint**: `https://2m1153u1z1.execute-api.us-east-1.amazonaws.com`
- **S3 Bucket**: `adapta-ui-984625844016` (CloudFront OAC: `adapta-oac-984625844016`)
- **Lambda Function**: `arn:aws:lambda:us-east-1:984625844016:function:adapta-backend-api`
- **Design Prototype Palette**:
  - Primary Accent: `#ff00ad` (Neon Magenta / Fuchsia)
  - Secondary Accent: `#650046` (Deep Wine)
  - Background: `#15000e` (Dark Fuchsia / Plum)
  - Surface Panel: `#26071c`
  - Background Halo: Rotating dotted halo (`animation: themePattern 14s linear infinite;`)

---

## 2. Omnichannel Deliverables & Capabilities
ADAPTA takes any corporate announcement, product launch, marketing brief, or document spec and adapts it across 7 mission-critical channels:
1. **Email Marketing**:
   - A/B Testing Subject Lines (2 options with 1-click copy)
   - Preheader / Preview Text (<90 chars)
   - Rich structured body copy with greeting and bulleted value props
   - Primary Call-to-Action
2. **SMS (<160 chars)**:
   - Punchy, urgent copy strictly under 160 characters
   - Character count tag
   - Opt-out compliance tag (`Reply STOP to opt out`)
3. **WhatsApp Rich Broadcast**:
   - Rich markdown formatting with bolding, emojis, and bullet points
   - Clean mobile chat simulator card
4. **Mobile Push Notification**:
   - Title (<40 chars)
   - Body (<110 chars)
   - Deep link schema target
   - Mobile lock screen preview card
5. **LinkedIn B2B Thought Leadership**:
   - Executive tone, structured narrative, and relevant industry hashtags
6. **X / Twitter**:
   - Main tweet (<280 chars)
   - Multi-part thread points
7. **In-App Modal / Banner**:
   - What's New tag, punchy headline, concise body (<140 chars), and primary action button
8. **Target JSON Payload**:
   - Production-ready schema payload for programmatic CRM / ESP ingestion (Braze, Iterable, Salesforce Marketing Cloud, Customer.io).

---

## 3. Zero Bug Manifesto Conformance
1. **Conversational Smoothness ("bro", "hi", "namaste", questions)**:
   - Instant response without errors or schema rejections.
   - Multilingual support for Hindi, Tamil, Telugu, Spanish, French, etc.
2. **Universal TAXORA Standard Delete Confirmation**:
   - Inline non-shifting delete confirmation: `Delete adaptation? [Yes] [No]`.
   - Matching TAXORA red alert styling and clear pill buttons.
3. **Sidebar Fixed 38px Rows**:
   - Strict 38px fixed height, `padding: 0 54px 0 12px;`, `overflow: hidden;`.
   - Absolute hover action buttons (`.histActions`) with visible theme colors (`#ff00ad` for edit, `#fca5a5` for delete).
   - Zero layout jank, zero shifting on hover.
4. **Scrollbar Stability**:
   - `scrollbar-gutter: stable;` preventing layout flickers on scrollbar appearance.
5. **Compact Empty State**:
   - `.card.emptyCard { max-width: 380px; margin: 0 auto; padding: 16px 20px; }`.
6. **Single HOME Button**:
   - Unified navigation in header.
7. **Reactive Smart Auto-Titling**:
   - Dynamically titles conversations based on attached files, campaign names, or user input.
8. **CloudFront API Routing**:
   - Attached `AllViewerExceptHostHeader` policy (`b689b0a8-53d0-40ab-baf2-68738e2966ac`).
   - Only 403 custom error response (never 404), completely eliminating `<!doctype html>` JSON parse bugs.

---

## 4. Verification Suite Results
- Test 1 (Health Check): PASS
- Test 2 (Conversational "bro" prompt): PASS
- Test 3 (Conversational "hi" prompt): PASS
- Test 4 (Multilingual "namaste"): PASS
- Test 5 (Omnichannel adaptation across 7 channels): PASS (Readiness Score: 95/100)
- Test 6 (File upload & Document Viewer): PASS
- Test 7 (CloudFront Static index.html): PASS

