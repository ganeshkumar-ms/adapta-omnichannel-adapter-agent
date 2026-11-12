import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

CLOUDFRONT_URL = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('ADAPTA_CLOUDFRONT_URL')

if not CLOUDFRONT_URL:
    print("Error: Please provide CloudFront URL as argument")
    sys.exit(1)

if not CLOUDFRONT_URL.startswith('http'):
    CLOUDFRONT_URL = f"https://{CLOUDFRONT_URL}"

print(f"=== TESTING ADAPTA LIVE ENDPOINT: {CLOUDFRONT_URL} ===\n")

passed = 0
failed = 0

def post_form(url, data_dict):
    encoded = urllib.parse.urlencode(data_dict).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=encoded,
        headers={'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, json.loads(resp.read().decode('utf-8'))

def post_multipart(url, fields, files):
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body = bytearray()
    for k, v in fields.items():
        body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode('utf-8'))
    for k, (fname, content, ctype) in files.items():
        body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"; filename="{fname}"\r\nContent-Type: {ctype}\r\n\r\n'.encode('utf-8'))
        body.extend(content if isinstance(content, bytes) else content.encode('utf-8'))
        body.extend(b'\r\n')
    body.extend(f'--{boundary}--\r\n'.encode('utf-8'))

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}', 'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=35) as resp:
        return resp.status, json.loads(resp.read().decode('utf-8'))

def test(name, fn):
    global passed, failed
    print(f"TEST: {name}...", end=" ", flush=True)
    try:
        fn()
        print("✓ PASS")
        passed += 1
    except Exception as e:
        print(f"✗ FAIL: {e}")
        failed += 1

# 1. Health check
def test_health():
    req = urllib.request.Request(f"{CLOUDFRONT_URL}/api/health", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode('utf-8'))
        assert data.get('agent') == 'ADAPTA', f"Expected ADAPTA, got {data.get('agent')}"
        assert data.get('status') == 'ok', f"Expected ok, got {data.get('status')}"
test("1. CloudFront /api/health endpoint", test_health)

# 2. Conversational Interceptor ("bro")
def test_bro():
    status, data = post_form(f"{CLOUDFRONT_URL}/api/adapt", {"text": "bro"})
    assert status == 200, f"Expected 200, got {status}"
    assert data.get('type') == 'chat', f"Expected type 'chat', got {data.get('type')}"
    msg = data.get('message', '')
    assert len(msg) > 5, "Expected friendly conversational reply"
    assert 'error' not in msg.lower(), "Message should not contain error"
    assert 'schema' not in msg.lower(), "Should not report schema conflicts"
    assert 'not accepted' not in msg.lower(), "Should not say text not accepted"
test("2. Conversational prompt 'bro' (Zero defect interceptor)", test_bro)

# 3. Conversational Greeting ("hi")
def test_hi():
    status, data = post_form(f"{CLOUDFRONT_URL}/api/adapt", {"text": "hi"})
    assert status == 200, f"Expected 200, got {status}"
    assert data.get('type') == 'chat', f"Expected type 'chat', got {data.get('type')}"
    assert len(data.get('message', '')) > 5, "Expected non-empty conversational reply"
test("3. Conversational greeting 'hi'", test_hi)

# 4. Multilingual Greeting ("namaste")
def test_namaste():
    status, data = post_form(f"{CLOUDFRONT_URL}/api/adapt", {"text": "namaste"})
    assert status == 200, f"Expected 200, got {status}"
    assert data.get('type') == 'chat', f"Expected type 'chat', got {data.get('type')}"
test("4. Multilingual greeting 'namaste'", test_namaste)

# 5. Core Message Omnichannel Adaptation
def test_omnichannel_adaptation():
    payload_text = "We are thrilled to launch NovaPay 2.0, our next-generation zero-fee instantaneous global settlement platform for enterprise fintechs."
    status, data = post_form(f"{CLOUDFRONT_URL}/api/adapt", {"text": payload_text})
    assert status == 200, f"Expected 200, got {status}"
    assert data.get('type') == 'adaptation', f"Expected type 'adaptation', got {data.get('type')}"
    readiness = data.get('adaptation_readiness', {})
    assert 'score' in readiness, "Expected readiness score"
    channels = data.get('channels', {})
    for ch in ['email', 'sms', 'whatsapp', 'push', 'linkedin', 'twitter', 'in_app']:
        assert ch in channels, f"Missing channel variant: {ch}"
    print(f" [Score: {readiness.get('score')}/100, Channels: {len(channels)}]", end="")
test("5. Omnichannel adaptation across 7 channels", test_omnichannel_adaptation)

# 6. File attachment and document viewer
def test_file_upload_and_viewer():
    sample_content = b"CAMPAIGN BRIEF: Enterprise Omnichannel Expansion Q4\nObjective: Migrate legacy transactional notifications to conversational WhatsApp and Push.\nBudget: $250k\nTarget: High-net-worth BFSI customers."
    files = {"file": ("campaign_brief_q4.txt", sample_content, "text/plain")}
    fields = {"text": "Please adapt this campaign brief across our primary customer channels."}
    status, resp_data = post_multipart(f"{CLOUDFRONT_URL}/api/adapt", fields, files)
    assert status == 200, f"Expected 200, got {status}"
    doc = resp_data.get('document')
    assert doc is not None, "Expected document metadata in response"
    assert 'campaign_brief_q4.txt' in doc.get('filename', ''), "Expected filename in metadata"
    view_url = doc.get('view_url')
    assert view_url, "Expected view_url"

    # Test viewer endpoint
    full_view_url = f"{CLOUDFRONT_URL}{view_url}" if view_url.startswith('/') else view_url
    req = urllib.request.Request(full_view_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=20) as view_resp:
        assert view_resp.status == 200, f"Expected 200 on viewer, got {view_resp.status}"
        body_text = view_resp.read().decode('utf-8', errors='replace')
        assert "ADAPTA Document Viewer" in body_text or "campaign_brief_q4.txt" in body_text, "Expected viewer content"
    print(f" [View URL OK: {view_url}]", end="")
test("6. File upload and document viewer endpoint", test_file_upload_and_viewer)

# 7. CloudFront index.html static hosting
def test_static():
    req = urllib.request.Request(f"{CLOUDFRONT_URL}/index.html", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        content = resp.read().decode('utf-8', errors='replace')
        assert "ADAPTA" in content, "Expected ADAPTA in index.html"
test("7. CloudFront static UI index.html", test_static)

print(f"\n=== RESULTS: {passed} PASSED, {failed} FAILED ===")
if failed > 0:
    sys.exit(1)
