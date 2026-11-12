import html
from pathlib import Path


def render_html(file_path: Path, display_name: str) -> str:
    """Renders document content into a beautiful dark fuchsia/plum HTML viewer."""
    ext = file_path.suffix.lower()
    content_raw = ""
    try:
        content_raw = file_path.read_text(encoding='utf-8', errors='replace')
    except Exception:
        content_raw = f"[Binary or encoded file: {display_name}]"

    safe_content = html.escape(content_raw)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(display_name)} - ADAPTA Viewer</title>
<style>
  :root {{
    --bg: #15000e;
    --panel: #26071c;
    --line: rgba(255, 0, 173, 0.2);
    --text: #ffffff;
    --muted: #b88ba8;
    --a1: #ff00ad;
    --a2: #650046;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', -apple-system, sans-serif;
    padding: 24px;
    line-height: 1.6;
  }}
  .header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 20px;
  }}
  .titleWrap {{ display: flex; align-items: center; gap: 10px; }}
  .title {{ font-size: 16px; font-weight: 700; color: #fff; }}
  .badge {{
    background: rgba(255, 0, 173, 0.15);
    color: var(--a1);
    border: 1px solid rgba(255, 0, 173, 0.4);
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
  }}
  .viewerBox {{
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 20px;
    overflow-x: auto;
    max-height: 85vh;
  }}
  pre {{
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: #ffd6f3;
    white-space: pre-wrap;
    word-break: break-word;
  }}
</style>
</head>
<body>
  <div class="header">
    <div class="titleWrap">
      <span class="title">{html.escape(display_name)}</span>
      <span class="badge">ADAPTA CONTENT SPECIFICATION</span>
    </div>
  </div>
  <div class="viewerBox">
    <pre>{safe_content}</pre>
  </div>
</body>
</html>
"""

