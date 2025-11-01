from pathlib import Path
import sys
text = Path("server.js").read_text(encoding="utf-8")
pattern = "console.log(`"
idx = text.index(pattern)
segment = text[idx:idx+80]
sys.stdout.buffer.write(repr(segment).encode("utf-8"))
