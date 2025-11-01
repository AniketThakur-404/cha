from pathlib import Path
import sys
text = Path('server.js').read_text(encoding='utf-8')
start = text.index('const noopAsync')
segment = text[start:start+400]
sys.stdout.buffer.write(segment.encode('utf-8'))
