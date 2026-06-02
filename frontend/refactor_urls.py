import re

file_path = r"d:\AI\frontend\src\App.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "const InterviewCard = ({ type, onClick, cardStyles }) => {",
    "const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';\n\nconst InterviewCard = ({ type, onClick, cardStyles }) => {"
)

content = content.replace("http://localhost:8000", "${API_BASE_URL}")
content = content.replace("'${API_BASE_URL}/chat'", "`${API_BASE_URL}/chat`")
content = content.replace("'${API_BASE_URL}/clear-history'", "`${API_BASE_URL}/clear-history`")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Replaced all hardcoded URLs with API_BASE_URL in App.js.")
