from pathlib import Path
import sys
text = Path("server.js").read_text(encoding="utf-8")
start = text.index("sequelize\n    .sync()")
segment = text[start:start+120]
sys.stdout.buffer.write(segment.encode("utf-8"))
