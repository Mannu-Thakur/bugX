import sqlite3

db_path = "sqlite_fallback.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, slug, title FROM problems WHERE slug = 'binary-tree-right-side-view'")
problem = cursor.fetchone()

if problem:
    prob_id = problem[0]
    cursor.execute("SELECT id, language, function_name, arg_style, template_code FROM problem_templates WHERE problem_id = ?", (prob_id,))
    tpls = cursor.fetchall()
    for t in tpls:
        print(f"Lang: {t[1]} | FuncName: {t[2]} | ArgStyle: {t[3]}")
else:
    print("Problem not found.")

conn.close()
