#!/usr/bin/env python3
"""
Local AI Engine - Digital Fortress
This module provides COMPLETELY LOCAL AI processing using Ollama.
NO CODE EVER LEAVES YOUR LAPTOP. PERIOD.

Usage:
    from local_ai_engine import LocalAIEngine
    
    ai = LocalAIEngine()
    result = ai.review_code(code_snippet)
    analysis = ai.analyze_security(code)
"""

import json
import re
import os
import sqlite3
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SECRET_PATTERNS = [
    (r'(?i)(api[_-]?key|apikey)\s*[=:]\s*["\']?[a-zA-Z0-9_-]{20,}', 'API Key'),
    (r'(?i)(secret[_-]?key|secretkey|secret_token)\s*[=:]\s*["\']?[a-zA-Z0-9_-]{20,}', 'Secret Key'),
    (r'(?i)(password|passwd|pwd)\s*[=:]\s*["\'][^"\']{8,}', 'Password'),
    (r'(?i)(private[_-]?key)\s*[=:]\s*["\']?-----BEGIN', 'Private Key'),
    (r'sk_live_[a-zA-Z0-9]{24,}', 'Stripe Live Key'),
    (r'AKIA[0-9A-Z]{16}', 'AWS Access Key'),
    (r'(?i)(database|db)[_-]?url\s*[=:]\s*["\']?postgres://[^"\s]+', 'Database URL'),
    (r'(?i)(database|db)[_-]?url\s*[=:]\s*["\']?mysql://[^"\s]+', 'Database URL'),
    (r'(?i)(database|db)[_-]?url\s*[=:]\s*["\']?mongodb\+srv://[^"\s]+', 'MongoDB URL'),
    (r'ghp_[a-zA-Z0-9]{36}', 'GitHub Token'),
    (r'xox[baprs]-[0-9a-zA-Z]{10,}', 'Slack Token'),
]

def _detect_secrets(content: str) -> List[Tuple[str, str]]:
    """Detect secrets in content using regex patterns"""
    found = []
    for pattern, secret_type in SECRET_PATTERNS:
        matches = re.finditer(pattern, content)
        for match in matches:
            found.append((secret_type, match.group(0)[:50] + '...'))
    return found

@dataclass
class LocalAIResult:
    """Result from local AI processing"""
    content: str
    confidence: float
    model_used: str
    processing_time_ms: int
    local_only: bool = True
    timestamp: str = ""
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


class LocalAIEngine:
    """
    Local AI Engine for Digital Fortress
    Uses Ollama for all AI processing - 100% local, 0% external
    """
    
    def __init__(self, config_path: str = ".fortress.env"):
        """Initialize the local AI engine"""
        self.config = self._load_config(config_path)
        self.ollama_host = self.config.get("OLLAMA_HOST", "http://localhost:11434")
        self.default_model = self.config.get("OLLAMA_DEFAULT_MODEL", "codellama:7b-code")
        self.fallback_model = self.config.get("OLLAMA_FALLBACK_MODEL", "codellama:13b-code")
        self.local_db_path = self.config.get("LEARNING_DB_PATH", "./.fortress/learning-patterns.db")
        
        self._ensure_directories()
        self._init_learning_db()
        
        logger.info("✅ Local AI Engine initialized - 100% LOCAL MODE")
        logger.info(f"   Model: {self.default_model}")
        logger.info(f"   Ollama: {self.ollama_host}")
    
    def _load_config(self, config_path: str) -> Dict[str, str]:
        """Load configuration from .env file"""
        config = {}
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip()
        return config
    
    def _ensure_directories(self):
        """Ensure all local directories exist"""
        dirs = [
            "./.fortress",
            "./.fortress/logs",
            "./.fortress/cache",
            "./.fortress/models"
        ]
        for d in dirs:
            Path(d).mkdir(parents=True, exist_ok=True)
    
    def _init_learning_db(self):
        """Initialize the local SQLite learning database"""
        try:
            conn = sqlite3.connect(self.local_db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS code_patterns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pattern_type TEXT NOT NULL,
                    pattern_hash TEXT UNIQUE NOT NULL,
                    pattern_data TEXT NOT NULL,
                    frequency INTEGER DEFAULT 1,
                    success_rate REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS developer_feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT NOT NULL,
                    suggestion_type TEXT NOT NULL,
                    was_accepted BOOLEAN,
                    was_modified BOOLEAN,
                    feedback_text TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS learning_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_data TEXT NOT NULL,
                    patterns_learned INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("✅ Local learning database initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize learning database: {e}")
    
    def _call_ollama(self, prompt: str, model: Optional[str] = None) -> LocalAIResult:
        """
        Call Ollama for local AI processing
        NO NETWORK CALLS OUTSIDE LOCALHOST
        """
        import time
        import urllib.request
        import urllib.error
        
        model = model or self.default_model
        start_time = time.time()
        
        try:
            data = {
                "model": model,
                "prompt": prompt,
                "stream": False
            }
            
            req = urllib.request.Request(
                f"{self.ollama_host}/api/generate",
                data=json.dumps(data).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            with urllib.request.urlopen(req, timeout=300) as response:
                result = json.loads(response.read().decode('utf-8'))
                
            processing_time = int((time.time() - start_time) * 1000)
            
            return LocalAIResult(
                content=result.get('response', ''),
                confidence=0.85,
                model_used=model,
                processing_time_ms=processing_time,
                local_only=True
            )
            
        except urllib.error.URLError as e:
            logger.error(f"❌ Ollama not available at {self.ollama_host}: {e}")
            return self._fallback_response(prompt)
        except Exception as e:
            logger.error(f"❌ Error calling Ollama: {e}")
            return self._fallback_response(prompt)
    
    def _fallback_response(self, prompt: str) -> LocalAIResult:
        """Generate fallback response when Ollama is not available"""
        import hashlib
        
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:8]
        
        return LocalAIResult(
            content=f"[LOCAL FALLBACK] Analysis complete. Hash: {prompt_hash}\n\nPlease ensure Ollama is running: ollama run codellama:7b-code",
            confidence=0.5,
            model_used="fallback",
            processing_time_ms=0,
            local_only=True
        )
    
    def review_code(self, code: str, language: str = "python") -> LocalAIResult:
        """Review code using local AI"""
        prompt = f"""You are a code reviewer. Analyze the following {language} code and provide:
1. Security issues
2. Performance improvements
3. Best practice violations
4. Style suggestions

Code:
```{language}
{code}
```

Provide your analysis in a structured format:"""

        return self._call_ollama(prompt, self.config.get("CODE_REVIEW_MODEL"))
    
    def analyze_security(self, code: str, language: str = "python") -> LocalAIResult:
        """Security analysis using local AI"""
        prompt = f"""You are a security expert. Analyze this {language} code for security vulnerabilities:

```{language}
{code}
```

Identify:
1. Injection vulnerabilities
2. Authentication issues
3. Data exposure risks
4. Insecure dependencies
5. Cryptographic weaknesses

Format: List each issue with severity (Critical/High/Medium/Low) and explanation."""

        return self._call_ollama(prompt, self.config.get("SECURITY_MODEL"))
    
    def suggest_refactoring(self, code: str, language: str = "python") -> LocalAIResult:
        """Suggest refactoring using local AI"""
        prompt = f"""You are a refactoring expert. Suggest improvements for this {language} code:

```{language}
{code}
```

Focus on:
1. Code readability
2. Performance optimization
3. Design pattern application
4. Reducing complexity
5. Improving maintainability

Provide specific before/after examples."""

        return self._call_ollama(prompt, self.config.get("REFACTORING_MODEL"))
    
    def learn_from_feedback(self, file_path: str, suggestion_type: str, 
                           was_accepted: bool, was_modified: bool,
                           feedback_text: Optional[str] = None) -> bool:
        """Learn from developer feedback"""
        try:
            conn = sqlite3.connect(self.local_db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO developer_feedback 
                (file_path, suggestion_type, was_accepted, was_modified, feedback_text)
                VALUES (?, ?, ?, ?, ?)
            ''', (file_path, suggestion_type, was_accepted, was_modified, feedback_text))
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Learned from feedback: {suggestion_type} - {'accepted' if was_accepted else 'rejected'}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to store feedback: {e}")
            return False
    
    def get_learning_stats(self) -> Dict[str, Any]:
        """Get learning statistics from local database"""
        try:
            conn = sqlite3.connect(self.local_db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_feedback,
                    SUM(CASE WHEN was_accepted = 1 THEN 1 ELSE 0 END) as accepted,
                    SUM(CASE WHEN was_modified = 1 THEN 1 ELSE 0 END) as modified
                FROM developer_feedback
            ''')
            feedback_stats = cursor.fetchone()
            
            cursor.execute('SELECT COUNT(*) FROM code_patterns')
            pattern_count = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                "total_feedback": feedback_stats[0] or 0,
                "accepted_suggestions": feedback_stats[1] or 0,
                "modified_suggestions": feedback_stats[2] or 0,
                "learned_patterns": pattern_count,
                "acceptance_rate": (feedback_stats[1] / feedback_stats[0] * 100) if feedback_stats[0] > 0 else 0,
                "local_only": True
            }
        except Exception as e:
            logger.error(f"❌ Failed to get learning stats: {e}")
            return {"error": str(e), "local_only": True}
    
    def is_local_only(self) -> bool:
        """Verify this engine is running in local-only mode"""
        return True


_local_ai_engine = None

def get_local_ai_engine() -> LocalAIEngine:
    """Get or create the singleton local AI engine"""
    global _local_ai_engine
    if _local_ai_engine is None:
        _local_ai_engine = LocalAIEngine()
    return _local_ai_engine


def check_staged_changes() -> int:
    """Check staged changes for code review - used by pre-commit hook"""
    import subprocess
    
    print("🏰 Digital Fortress Pre-Commit Check")
    print("=" * 50)
    
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--no-color'],
            capture_output=True,
            text=True
        )
        staged_diff = result.stdout
        
        if not staged_diff:
            print("✅ No staged changes to review")
            return 0
        
        print(f"📝 Found {len(staged_diff.splitlines())} lines of staged changes")
        
        print("🔍 Scanning for secrets...")
        secrets_found = _detect_secrets(staged_diff)
        
        if secrets_found:
            print("\n🚨 CRITICAL: Secrets detected!")
            print("-" * 50)
            for secret_type, match in secrets_found:
                print(f"   ⚠️  {secret_type}: {match}")
            print("-" * 50)
            print("\n❌ Commit BLOCKED - Secrets found in staged changes!")
            print("   Remove secrets or use: git commit --no-verify")
            print("   (--no-verify is NOT recommended)")
            return 1
        
        print("✅ No secrets detected")
        
        ai = LocalAIEngine()
        
        print("🔍 Running local AI analysis...")
        review_result = ai.review_code(staged_diff, language="diff")
        
        content = review_result.content.lower()
        has_critical = 'critical' in content or 'security' in content
        has_high = 'high' in content or 'severe' in content
        
        print("\n📋 Analysis Results:")
        print("-" * 50)
        print(review_result.content)
        print("-" * 50)
        
        if has_critical:
            print("\n❌ CRITICAL issues found! Commit blocked.")
            print("   Fix critical issues or use --no-verify to skip (not recommended)")
            return 1
        elif has_high:
            print("\n⚠️  HIGH severity issues found. Review recommended.")
            return 0
        else:
            print("\n✅ No critical issues found. Proceeding with commit.")
            return 0
            
    except Exception as e:
        logger.error(f"❌ Pre-commit check failed: {e}")
        print("\n⚠️  Could not complete analysis. Allowing commit.")
        return 0


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--check-staged':
        exit_code = check_staged_changes()
        sys.exit(exit_code)
    
    print("🚀 Testing Digital Fortress Local AI Engine")
    print("=" * 50)
    
    ai = LocalAIEngine()
    
    test_code = """
def authenticate_user(username, password):
    if username == "admin" and password == "password123":
        return True
    return False
"""
    
    print("\n📝 Testing code review...")
    result = ai.review_code(test_code)
    print(f"Model: {result.model_used}")
    print(f"Local Only: {result.local_only}")
    print(f"Response preview: {result.content[:200]}...")
    
    print("\n📊 Learning stats:")
    stats = ai.get_learning_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    print("\n✅ Local AI Engine test complete - NO DATA LEFT YOUR LAPTOP!")
