#!/usr/bin/env python3
"""
Setup script for CodeFlow CI/CD Pipeline Server

This script sets up the Python environment and installs dependencies.
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"📦 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, 
                              capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"   Error: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ is required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")
    return True

def install_dependencies():
    """Install Python dependencies"""
    return run_command("pip install -r requirements.txt", "Installing Python dependencies")

def create_virtual_environment():
    """Create and activate virtual environment"""
    if not Path("venv").exists():
        success = run_command("python3 -m venv venv", "Creating virtual environment")
        if not success:
            return False
    
    # Activate virtual environment
    if os.name == 'nt':  # Windows
        activate_script = "venv\\Scripts\\activate"
    else:  # Unix/Linux/MacOS
        activate_script = "source venv/bin/activate"
    
    print(f"💡 To activate virtual environment, run: {activate_script}")
    return True

def setup_directories():
    """Create necessary directories"""
    directories = [
        "logs",
        "temp",
        "results"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"📁 Created directory: {directory}")
    
    return True

def create_env_file():
    """Create .env file with default values"""
    env_content = """# CodeFlow CI/CD Pipeline Server Configuration

# Server Configuration
HOST=0.0.0.0
PORT=3001
DEBUG=True

# AI Provider Configuration (Optional)
GEMINI_API_URL=
GEMINI_API_KEY=

# Security Configuration
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=*

# Pipeline Configuration
MAX_EXECUTION_TIME=3600
MAX_CONCURRENT_EXECUTIONS=5
LOG_LEVEL=INFO

# Database Configuration (Optional)
DATABASE_URL=sqlite:///./codeflow.db
"""
    
    if not Path(".env").exists():
        with open(".env", "w") as f:
            f.write(env_content)
        print("📝 Created .env file with default configuration")
    else:
        print("⚠️  .env file already exists, skipping creation")
    
    return True

def create_startup_scripts():
    """Create startup scripts for different platforms"""
    
    # Python server startup script
    python_script = """#!/usr/bin/env python3
import subprocess
import sys
import os

def main():
    # Check if virtual environment is activated
    if sys.prefix == sys.base_prefix:
        print("⚠️  Warning: Virtual environment not activated")
        print("💡 Run: source venv/bin/activate (Linux/Mac) or venv\\Scripts\\activate (Windows)")
    
    # Start the server
    print("🚀 Starting CodeFlow CI/CD Pipeline Server...")
    subprocess.run([
        sys.executable, "-m", "uvicorn", 
        "server:app", 
        "--host", "0.0.0.0", 
        "--port", "3001",
        "--reload"
    ])

if __name__ == "__main__":
    main()
"""
    
    with open("start_server.py", "w") as f:
        f.write(python_script)
    
    # Shell script for Linux/Mac
    shell_script = """#!/bin/bash
echo "🚀 Starting CodeFlow CI/CD Pipeline Server..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
fi

# Start the server
echo "🚀 Starting server on http://localhost:3001"
uvicorn server:app --host 0.0.0.0 --port 3001 --reload
"""
    
    with open("start_server.sh", "w") as f:
        f.write(shell_script)
    os.chmod("start_server.sh", 0o755)
    
    # Batch script for Windows
    batch_script = """@echo off
echo 🚀 Starting CodeFlow CI/CD Pipeline Server...

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\\Scripts\\activate

REM Install dependencies if needed
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo 📦 Installing dependencies...
    pip install -r requirements.txt
)

REM Start the server
echo 🚀 Starting server on http://localhost:3001
uvicorn server:app --host 0.0.0.0 --port 3001 --reload
"""
    
    with open("start_server.bat", "w") as f:
        f.write(batch_script)
    
    print("📜 Created startup scripts:")
    print("   - start_server.py (Python)")
    print("   - start_server.sh (Linux/Mac)")
    print("   - start_server.bat (Windows)")
    
    return True

def main():
    """Main setup function"""
    print("🚀 CodeFlow CI/CD Pipeline Server Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Create virtual environment
    if not create_virtual_environment():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Setup directories
    if not setup_directories():
        sys.exit(1)
    
    # Create environment file
    if not create_env_file():
        sys.exit(1)
    
    # Create startup scripts
    if not create_startup_scripts():
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Activate virtual environment:")
    print("   Linux/Mac: source venv/bin/activate")
    print("   Windows: venv\\Scripts\\activate")
    print("2. Start the server:")
    print("   python start_server.py")
    print("3. Open browser to: http://localhost:3001")
    print("\n📚 API documentation available at: http://localhost:3001/docs")
    print("=" * 50)

if __name__ == "__main__":
    main()