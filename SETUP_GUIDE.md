# 🚀 Travel Agent Setup Guide

## 📋 Prerequisites

1. **Docker Desktop** - Download from https://www.docker.com/products/docker-desktop/
2. **Python 3.8+** - Already installed on your system
3. **Git** - For cloning (if needed)

## 🐳 Step 1: Start PostgreSQL Database

```bash
# Open PowerShell/CMD in project root
cd "c:\Users\Devansh\Desktop\travel2"

# Start PostgreSQL container
docker-compose up -d

# Check if container is running
docker ps
```

## 🐍 Step 2: Setup Python Environment

```bash
# Activate virtual environment
myenv\Scripts\activate

# Install dependencies (already done)
pip install -r requirements.txt  # or the packages we installed manually
```

## 🔧 Step 3: Environment Variables

Create a `.env` file in the project root:

```env
# OpenAI API Key (required for agents)
OPENAI_API_KEY=your_openai_api_key_here

# Database (already configured)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/travel_agent

# Optional: SerpApi for real flight/hotel data
SERPAPI_API_KEY=your_serpapi_key_here
```

## 🚀 Step 4: Start Services

### Backend Server:
```bash
# Terminal 1: Start backend
cd "c:\Users\Devansh\Desktop\travel2"
myenv\Scripts\activate
python server.py
```

### Frontend Dev Server:
```bash
# Terminal 2: Start frontend
cd "c:\Users\Devansh\Desktop\travel2\frontend"
npm run dev
```

## 🌐 Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Database**: localhost:5432 (PostgreSQL)

## 🔍 Troubleshooting

### Docker Issues:
```bash
# Check Docker status
docker --version
docker-compose --version

# Restart Docker Desktop if needed
# Stop container: docker-compose down
# Start container: docker-compose up -d
```

### Database Connection:
```bash
# Test database connection
docker exec -it travel_agent_db psql -U postgres -d travel_agent -c "SELECT version();"
```

### Python Dependencies:
```bash
# Reinstall if needed
pip install --upgrade langgraph langchain langchain-openai langgraph-checkpoint-postgres psycopg-pool flask python-dotenv
```

## 📊 Project Structure

```
travel2/
├── agents/           # AI agent implementations
├── frontend/         # React frontend
├── server.py         # Flask backend server
├── test.py          # LangGraph workflow
├── docker-compose.yml # PostgreSQL setup
├── .env             # Environment variables
└── SETUP_GUIDE.md   # This file
```

## 🎯 Usage Flow

1. **Start** at "🧠 Plan" tab - Orchestrator creates execution plan
2. **Approve** the plan to start Phase 1 (Transport)
3. **Review** flights/trains and approve Phase 1
4. **Review** hotels/weather/news and approve Phase 2  
5. **View** complete itinerary in Phase 3
6. **Chat** with agents throughout the process

## 🔑 API Keys Needed

You'll need at least:
- **OpenAI API Key** - For the AI agents
- **SerpApi Key** (optional) - For real flight/hotel data

Get these from:
- OpenAI: https://platform.openai.com/api-keys
- SerpApi: https://serpapi.com/
