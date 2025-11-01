from pathlib import Path

path = Path("server.js")
text = path.read_text(encoding="utf-8")
start = text.index("const noopAsync")
end = text.index("const databaseConfigured", start)
replacement = "const noopAsync = async () => {};\nconst createFallbackUser = () => ({ name: null, update: noopAsync });\nconst createFallbackSession = () => ({ id: null, update: noopAsync });\n\nlet isDatabaseEnabled = true;\n\nconst disableDatabase = (err, context = 'unknown') => {\n  const label = `[DB:${context}]`;\n  if (err) {\n    console.error(label, err);\n  } else {\n    console.warn(`${label} Disabling database integration without error payload.`);\n  }\n  if (isDatabaseEnabled) {\n    isDatabaseEnabled = false;\n    console.warn('Database integration disabled; continuing without persistence.');\n  }\n};\n\n"
path.write_text(text[:start] + replacement + text[end:], encoding="utf-8")
