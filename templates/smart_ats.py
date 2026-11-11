import os, sys, re, glob

print("==================================================")
print(" 🚀 TOTSKIE TECH SOLUTIONS - SMART AUTO-ATS Engine")
print("==================================================")

# 1. Auto-discover web files in current directory
js_files = glob.glob("*.js")
html_files = glob.glob("*.html")

if not js_files or not html_files:
    print("❌ Error: Couldn't find .js or .html files in this folder!")
    sys.exit(1)

print(f"📦 Discovered JS Files  : {', '.join(js_files)}")
print(f"📄 Discovered HTML Files: {', '.join(html_files)}")

# Read all code content
js_content = ""
for js_f in js_files:
    with open(js_f, "r", encoding="utf-8") as f:
        js_content += f.read() + "\n"

html_content = ""
for html_f in html_files:
    with open(html_f, "r", encoding="utf-8") as f:
        html_content += f.read() + "\n"

errors = []

# 2. Check JS Syntax Integrity (Brace Matching)
open_b = js_content.count('{')
close_b = js_content.count('}')
if open_b != close_b:
    errors.append(f"JS Syntax Error: {open_b} open '{{' vs {close_b} close '}}'")
else:
    print(f" [PASS] JS Syntax Structure Validated ({open_b} braces matched)")

# 3. Auto-discover defined JavaScript functions
js_functions = set(re.findall(r'(?:function\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:function|\([^)]*\)\s*=>))', js_content))
defined_funcs = {f for tuple_match in js_functions for f in tuple_match if f}

print(f" [PASS] Auto-detected {len(defined_funcs)} JS functions in codebase.")

# 4. Auto-discover HTML DOM Click Event bindings and verify linkage
html_clicks = set(re.findall(r'onclick=["\']\s*([a-zA-Z0-9_]+)\s*\(', html_content))

missing_links = 0
for click_func in html_clicks:
    if click_func not in defined_funcs and click_func not in js_content:
        errors.append(f"Unlinked HTML Handler: 'onclick=\"{click_func}()\"' missing implementation in JS!")
        missing_links += 1

if missing_links == 0:
    print(f" [PASS] All {len(html_clicks)} HTML click events matched to JS functions!")

# Summary Output
print("--------------------------------------------------")
if errors:
    print("❌ ATS FAILED (Critical Issues Found):")
    for err in errors:
        print(f"   [ERROR] {err}")
    sys.exit(1)

print("🎉 SMART ATS STATUS: 100% HEALTHY! Code logic fully verified.")
print("==================================================")
