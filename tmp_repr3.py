from pathlib import Path
import sys
text = Path("server.js").read_text(encoding="utf-8")
pattern = "Saved user name"
idx = text.index(pattern)
segment = text[idx-40:idx+60]
sys.stdout.buffer.write(repr(segment).encode("utf-8"))
