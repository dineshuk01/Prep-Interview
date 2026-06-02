import os

readme_content = """# AI Interview Platform

A full-stack, AI-powered mock interview application that simulates real-world technical and behavioral interviews. It uses advanced language models and text-to-speech capabilities to give candidates a realistic, interactive practice environment. 

## ✨ Features

- **Multi-Discipline Interviews**: Specialized prompts for Software Development (SDE), Data Analyst, System Design, HR, and Case Study rounds.
- **Voice Interactions**: Built-in Web Speech API integration for speech-to-text input, and backend OpenAI text-to-speech (TTS) output.
- **Secure Authentication**: Full login and signup system using secure password hashing (`bcrypt`).
- **Session History Persistence**: All interviews are saved directly to a MongoDB backend. Log out and log back in, and your past interviews will be restored.
- **Responsive UI**: Beautiful, modern React frontend with customizable Light/Dark themes and Lucide icons.
- **Fully Environment-Driven**: API routes and configuration are securely abstracted into `.env` files.

## 🛠️ Technology Stack

**Frontend:**
- React.js (Create React App)
- CSS (Custom Variables, Flexbox/Grid Layouts)
- Lucide React (Icons)
- Web Speech API (Browser native speech recognition)

**Backend:**
- Python 3.9+
- FastAPI (High-performance API framework)
- Uvicorn (ASGI server)
- OpenAI API (GPT-3.5/4 for responses, TTS for audio output)
- MongoDB / Motor (Asynchronous database driver)
- Bcrypt (Password hashing)

## 📁 Project Structure

```text
Prep-Interview/
├── backend/
│   ├── main.py              # Main FastAPI application and routing
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Backend environment variables
│   └── static/audio/        # Directory for generated TTS audio files
│
├── frontend/
│   ├── src/
│   │   ├── App.js           # Core React application (UI, Auth, Chat, Routing)
│   │   ├── index.css        # Global CSS variables
│   │   └── index.js         # React entry point
│   ├── package.json         # Node dependencies
│   └── .env                 # Frontend environment variables
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js & npm
- Python 3.9+
- MongoDB instance (Atlas or local)
- OpenAI API Key

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: .\\venv\\Scripts\\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   MONGO_DB=ai_interview_platform
   FRONTEND_URL=http://localhost:3000
   PORT=8000
   ```
5. Run the FastAPI server:
   ```bash
   python main.py
   ```
   *The backend will run at `http://localhost:8000`.*

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend/` directory:
   ```env
   REACT_APP_API_URL=http://localhost:8000
   ```
4. Start the development server:
   ```bash
   npm start
   ```
   *The frontend will run at `http://localhost:3000`.*

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/signup` | Registers a new user and returns a unique `user_id`. |
| `POST` | `/login` | Authenticates a user and returns their credentials. |
| `POST` | `/chat` | Sends a message to the AI, saves it to history, and returns a text/audio response. |
| `GET`  | `/history/{session_id}/{round_type}/{user_id}` | Fetches conversation history for a specific interview session securely. |
| `GET`  | `/sessions/{user_id}` | Retrieves a summarized list of all past sessions for a user. |
| `POST` | `/clear-history` | Deletes the history for a specific interview round. |

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
"""

file_path = r"d:\AI\README.md"
if os.path.exists(file_path):
    os.remove(file_path)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(readme_content)

print("Rewrote README.md in pure UTF-8!")
