from pathlib import Path
import sys
text = Path("server.js").read_text(encoding="utf-8")
start = text.index("console.log('")
end = text.index("))", start)
segment = text[start:end+2]
sys.stdout.buffer.write(repr(segment).encode("utf-8"))
