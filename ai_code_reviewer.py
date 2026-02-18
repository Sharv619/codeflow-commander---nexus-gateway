#!/usr/bin/env python3
"""
AI Code Reviewer - Embeddable Code Review System

This module provides an embeddable AI code review system that can be integrated
into any Python application. It includes both rule-based analysis and AI-powered
review capabilities.

Usage:
    from ai_code_reviewer import CodeReviewer
    
    reviewer = CodeReviewer()
    result = reviewer.review_code(code_snippet)
    print(result)
"""

import json
import re
import ast
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ReviewType(Enum):
    SECURITY = "Security"
    BUG = "Bug"
    PERFORMANCE = "Performance"
    STYLE = "Style"
    MAINTAINABILITY = "Maintainability"
    BEST_PRACTICE = "Best Practice"


class Severity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass
class Issue:
    line: int
    type: ReviewType
    severity: Severity
    description: str
    suggestion: Optional[str] = None
    link: Optional[str] = None


@dataclass
class FileReview:
    file_name: str
    status: str  # "PASS" or "FAIL"
    score: int  # 1-10
    issues: List[Issue]
    suggestions: List[str]


@dataclass
class ReviewResult:
    overall_status: str  # "PASS" or "FAIL"
    summary: str
    score: int  # 1-10
    files: List[FileReview]


class CodeReviewer:
    """
    AI-Powered Code Reviewer
    
    This class provides comprehensive code review capabilities including:
    - Rule-based static analysis
    - Pattern matching for common issues
    - Security vulnerability detection
    - Performance optimization suggestions
    - Code quality scoring
    """
    
    def __init__(self):
        self.security_patterns = self._load_security_patterns()
        self.bug_patterns = self._load_bug_patterns()
        self.style_patterns = self._load_style_patterns()
        self.performance_patterns = self._load_performance_patterns()
    
    def _load_security_patterns(self) -> List[Dict[str, Any]]:
        """Load security vulnerability patterns"""
        return [
            {
                'pattern': r'eval\s*\(',
                'type': ReviewType.SECURITY,
                'severity': Severity.CRITICAL,
                'description': 'Use of eval() can lead to code injection vulnerabilities',
                'suggestion': 'Use ast.literal_eval() for safe evaluation or implement proper input validation'
            },
            {
                'pattern': r'exec\s*\(',
                'type': ReviewType.SECURITY,
                'severity': Severity.CRITICAL,
                'description': 'Use of exec() can lead to code injection vulnerabilities',
                'suggestion': 'Avoid dynamic code execution or implement strict input validation'
            },
            {
                'pattern': r'pickle\.loads?\s*\(',
                'type': ReviewType.SECURITY,
                'severity': Severity.HIGH,
                'description': 'Unpickling data from untrusted sources can execute arbitrary code',
                'suggestion': 'Use JSON for serialization or validate pickle sources'
            },
            {
                'pattern': r'os\.system\s*\(',
                'type': ReviewType.SECURITY,
                'severity': Severity.HIGH,
                'description': 'Direct system command execution can lead to command injection',
                'suggestion': 'Use subprocess with proper argument handling'
            },
            {
                'pattern': r'subprocess\.(call|run|Popen)\s*\([^)]*shell\s*=\s*True',
                'type': ReviewType.SECURITY,
                'severity': Severity.HIGH,
                'description': 'Shell=True can lead to command injection vulnerabilities',
                'suggestion': 'Use shell=False and pass arguments as a list'
            },
            {
                'pattern': r'password\s*=',
                'type': ReviewType.SECURITY,
                'severity': Severity.HIGH,
                'description': 'Hardcoded password detected',
                'suggestion': 'Use environment variables or secure configuration management'
            },
            {
                'pattern': r'api[_-]?key\s*=',
                'type': ReviewType.SECURITY,
                'severity': Severity.HIGH,
                'description': 'Hardcoded API key detected',
                'suggestion': 'Use environment variables or secure credential storage'
            },
            {
                'pattern': r'secret\s*=',
                'type': ReviewType.SECURITY,
                'severity': Severity.HIGH,
                'description': 'Hardcoded secret detected',
                'suggestion': 'Use environment variables or secure configuration management'
            }
        ]
    
    def _load_bug_patterns(self) -> List[Dict[str, Any]]:
        """Load bug detection patterns"""
        return [
            {
                'pattern': r'==\s*None\b',
                'type': ReviewType.BUG,
                'severity': Severity.MEDIUM,
                'description': 'Use "is None" instead of "== None" for None checks',
                'suggestion': 'Replace == None with is None'
            },
            {
                'pattern': r'!=\s*None\b',
                'type': ReviewType.BUG,
                'severity': Severity.MEDIUM,
                'description': 'Use "is not None" instead of "!= None" for None checks',
                'suggestion': 'Replace != None with is not None'
            },
            {
                'pattern': r'for\s+\w+\s+in\s+range\s*\(\s*len\s*\(',
                'type': ReviewType.BUG,
                'severity': Severity.MEDIUM,
                'description': 'Using range(len()) is not Pythonic',
                'suggestion': 'Use enumerate() or direct iteration over items'
            },
            {
                'pattern': r'\.append\s*\(\s*\[\s*\]\s*\)',
                'type': ReviewType.BUG,
                'severity': Severity.LOW,
                'description': 'Appending empty list creates unnecessary nesting',
                'suggestion': 'Use extend() or direct assignment'
            },
            {
                'pattern': r'except\s*:',
                'type': ReviewType.BUG,
                'severity': Severity.MEDIUM,
                'description': 'Bare except clause catches all exceptions',
                'suggestion': 'Specify specific exception types'
            },
            {
                'pattern': r'except\s+Exception\s*:',
                'type': ReviewType.BUG,
                'severity': Severity.MEDIUM,
                'description': 'Too broad exception handling',
                'suggestion': 'Catch specific exceptions'
            }
        ]
    
    def _load_style_patterns(self) -> List[Dict[str, Any]]:
        """Load code style patterns"""
        return [
            {
                'pattern': r'print\s*\(',
                'type': ReviewType.STYLE,
                'severity': Severity.LOW,
                'description': 'Debug print statement found',
                'suggestion': 'Remove debug prints before production'
            },
            {
                'pattern': r'TODO|FIXME|XXX',
                'type': ReviewType.STYLE,
                'severity': Severity.LOW,
                'description': 'TODO/FIXME comment found',
                'suggestion': 'Address technical debt or create tracking issue'
            },
            {
                'pattern': r'\s+$',
                'type': ReviewType.STYLE,
                'severity': Severity.LOW,
                'description': 'Trailing whitespace detected',
                'suggestion': 'Remove trailing whitespace'
            },
            {
                'pattern': r'import\s+\*',
                'type': ReviewType.STYLE,
                'severity': Severity.MEDIUM,
                'description': 'Wildcard import makes code less readable',
                'suggestion': 'Import specific functions or use module prefix'
            }
        ]
    
    def _load_performance_patterns(self) -> List[Dict[str, Any]]:
        """Load performance optimization patterns"""
        return [
            {
                'pattern': r'for\s+\w+\s+in\s+range\s*\(\s*len\s*\(',
                'type': ReviewType.PERFORMANCE,
                'severity': Severity.MEDIUM,
                'description': 'Inefficient iteration pattern',
                'suggestion': 'Use enumerate() or direct iteration'
            },
            {
                'pattern': r'\+?\+\s*\[',
                'type': ReviewType.PERFORMANCE,
                'severity': Severity.MEDIUM,
                'description': 'Inefficient list concatenation in loop',
                'suggestion': 'Use list.extend() or list comprehension'
            },
            {
                'pattern': r'open\s*\([^)]*\)\.read\(\)',
                'type': ReviewType.PERFORMANCE,
                'severity': Severity.LOW,
                'description': 'Reading entire file into memory',
                'suggestion': 'Use context manager and process line by line for large files'
            }
        ]
    
    def _analyze_security_issues(self, code: str) -> List[Issue]:
        """Analyze code for security vulnerabilities"""
        issues = []
        lines = code.split('\n')
        
        for i, line in enumerate(lines, 1):
            for pattern_config in self.security_patterns:
                if re.search(pattern_config['pattern'], line, re.IGNORECASE):
                    issues.append(Issue(
                        line=i,
                        type=pattern_config['type'],
                        severity=pattern_config['severity'],
                        description=pattern_config['description'],
                        suggestion=pattern_config.get('suggestion')
                    ))
        
        return issues
    
    def _analyze_bug_patterns(self, code: str) -> List[Issue]:
        """Analyze code for potential bugs"""
        issues = []
        lines = code.split('\n')
        
        for i, line in enumerate(lines, 1):
            for pattern_config in self.bug_patterns:
                if re.search(pattern_config['pattern'], line):
                    issues.append(Issue(
                        line=i,
                        type=pattern_config['type'],
                        severity=pattern_config['severity'],
                        description=pattern_config['description'],
                        suggestion=pattern_config.get('suggestion')
                    ))
        
        return issues
    
    def _analyze_style_issues(self, code: str) -> List[Issue]:
        """Analyze code for style issues"""
        issues = []
        lines = code.split('\n')
        
        for i, line in enumerate(lines, 1):
            for pattern_config in self.style_patterns:
                if re.search(pattern_config['pattern'], line):
                    issues.append(Issue(
                        line=i,
                        type=pattern_config['type'],
                        severity=pattern_config['severity'],
                        description=pattern_config['description'],
                        suggestion=pattern_config.get('suggestion')
                    ))
        
        return issues
    
    def _analyze_performance_issues(self, code: str) -> List[Issue]:
        """Analyze code for performance issues"""
        issues = []
        lines = code.split('\n')
        
        for i, line in enumerate(lines, 1):
            for pattern_config in self.performance_patterns:
                if re.search(pattern_config['pattern'], line):
                    issues.append(Issue(
                        line=i,
                        type=pattern_config['type'],
                        severity=pattern_config['severity'],
                        description=pattern_config['description'],
                        suggestion=pattern_config.get('suggestion')
                    ))
        
        return issues
    
    def _calculate_score(self, issues: List[Issue]) -> int:
        """Calculate overall code quality score (1-10)"""
        if not issues:
            return 10
        
        # Calculate weighted score based on severity
        severity_weights = {
            Severity.CRITICAL: 3,
            Severity.HIGH: 2,
            Severity.MEDIUM: 1,
            Severity.LOW: 0.5,
            Severity.INFO: 0.1
        }
        
        total_penalty = sum(severity_weights[issue.severity] for issue in issues)
        
        # Score calculation: 10 - penalty, minimum 1
        score = max(1, 10 - int(total_penalty))
        return score
    
    def _generate_summary(self, issues: List[Issue], score: int) -> str:
        """Generate a summary of the code review"""
        if score >= 8:
            return "Code quality is good with minor issues."
        elif score >= 6:
            return "Code has some issues that should be addressed."
        elif score >= 4:
            return "Code has several issues that need attention."
        else:
            return "Code has significant issues that require immediate attention."
    
    def _parse_python_ast(self, code: str) -> Optional[ast.AST]:
        """Parse Python code into AST for deeper analysis"""
        try:
            return ast.parse(code)
        except SyntaxError:
            return None
    
    def _analyze_ast_issues(self, code: str, tree: ast.AST) -> List[Issue]:
        """Analyze AST for additional issues"""
        issues = []
        
        if tree is None:
            return issues
        
        class IssueVisitor(ast.NodeVisitor):
            def __init__(self, issues_list):
                self.issues = issues_list
                self.line_offset = 0
            
            def visit_FunctionDef(self, node):
                # Check for functions without docstrings
                if (not ast.get_docstring(node) and 
                    len(node.body) > 1 and 
                    node.lineno > 1):
                    self.issues.append(Issue(
                        line=node.lineno,
                        type=ReviewType.MAINTAINABILITY,
                        severity=Severity.LOW,
                        description=f"Function '{node.name}' lacks docstring",
                        suggestion="Add docstring describing function purpose and parameters"
                    ))
                
                # Check for too many parameters
                if len(node.args.args) > 5:
                    self.issues.append(Issue(
                        line=node.lineno,
                        type=ReviewType.MAINTAINABILITY,
                        severity=Severity.MEDIUM,
                        description=f"Function '{node.name}' has too many parameters ({len(node.args.args)})",
                        suggestion="Consider using **kwargs or data classes for many parameters"
                    ))
                
                self.generic_visit(node)
            
            def visit_ClassDef(self, node):
                # Check for classes without docstrings
                if (not ast.get_docstring(node) and 
                    len(node.body) > 1 and 
                    node.lineno > 1):
                    self.issues.append(Issue(
                        line=node.lineno,
                        type=ReviewType.MAINTAINABILITY,
                        severity=Severity.LOW,
                        description=f"Class '{node.name}' lacks docstring",
                        suggestion="Add docstring describing class purpose and responsibilities"
                    ))
                
                self.generic_visit(node)
        
        visitor = IssueVisitor(issues)
        visitor.visit(tree)
        
        return issues
    
    def review_code(self, code: str, file_name: str = "unknown") -> ReviewResult:
        """
        Perform comprehensive code review
        
        Args:
            code (str): The code to review
            file_name (str): Name of the file being reviewed
        
        Returns:
            ReviewResult: Comprehensive review result
        """
        logger.info(f"Starting review for {file_name}")
        
        # Analyze different types of issues
        security_issues = self._analyze_security_issues(code)
        bug_issues = self._analyze_bug_patterns(code)
        style_issues = self._analyze_style_issues(code)
        performance_issues = self._analyze_performance_issues(code)
        
        # Parse AST for deeper analysis
        tree = self._parse_python_ast(code)
        ast_issues = self._analyze_ast_issues(code, tree) if tree else []
        
        # Combine all issues
        all_issues = security_issues + bug_issues + style_issues + performance_issues + ast_issues
        
        # Calculate score and summary
        score = self._calculate_score(all_issues)
        summary = self._generate_summary(all_issues, score)
        
        # Determine overall status
        status = "PASS" if score >= 7 else "FAIL"
        
        # Create file review
        file_review = FileReview(
            file_name=file_name,
            status=status,
            score=score,
            issues=all_issues,
            suggestions=self._generate_suggestions(all_issues)
        )
        
        # Create final result
        result = ReviewResult(
            overall_status=status,
            summary=summary,
            score=score,
            files=[file_review]
        )
        
        logger.info(f"Review completed for {file_name}: Score {score}/10, Status {status}")
        return result
    
    def _generate_suggestions(self, issues: List[Issue]) -> List[str]:
        """Generate improvement suggestions based on issues"""
        suggestions = set()
        
        for issue in issues:
            if issue.suggestion:
                suggestions.add(issue.suggestion)
        
        return list(suggestions)
    
    def review_diff(self, diff_text: str) -> ReviewResult:
        """
        Review a diff/patch file
        
        Args:
            diff_text (str): Git diff output
        
        Returns:
            ReviewResult: Review result for the diff
        """
        # Extract code from diff
        code_lines = []
        for line in diff_text.split('\n'):
            if line.startswith('+') and not line.startswith('+++'):
                code_lines.append(line[1:])  # Remove + prefix
        
        if not code_lines:
            return ReviewResult(
                overall_status="PASS",
                summary="No new code changes detected",
                score=10,
                files=[]
            )
        
        code = '\n'.join(code_lines)
        return self.review_code(code, "diff")
    
    def to_json(self, result: ReviewResult) -> str:
        """Convert review result to JSON format"""
        return json.dumps(asdict(result), indent=2, default=str)
    
    def to_markdown(self, result: ReviewResult) -> str:
        """Convert review result to Markdown format"""
        md = f"# Code Review Results\n\n"
        md += f"**Overall Status**: {result.overall_status}\n"
        md += f"**Score**: {result.score}/10\n"
        md += f"**Summary**: {result.summary}\n\n"
        
        if result.files:
            for file_review in result.files:
                md += f"## File: {file_review.file_name}\n"
                md += f"- **Status**: {file_review.status}\n"
                md += f"- **Score**: {file_review.score}/10\n"
                md += f"- **Issues Found**: {len(file_review.issues)}\n\n"
                
                if file_review.issues:
                    md += "### Issues:\n\n"
                    for issue in file_review.issues:
                        md += f"- **Line {issue.line}**: {issue.type.value} ({issue.severity.value})\n"
                        md += f"  - {issue.description}\n"
                        if issue.suggestion:
                            md += f"  - **Suggestion**: {issue.suggestion}\n"
                        md += "\n"
                
                if file_review.suggestions:
                    md += "### General Suggestions:\n\n"
                    for suggestion in file_review.suggestions:
                        md += f"- {suggestion}\n"
                    md += "\n"
        
        return md


class AIEnhancedReviewer(CodeReviewer):
    """
    AI-Enhanced Code Reviewer
    
    Extends the basic CodeReviewer with AI capabilities for more sophisticated analysis.
    """
    
    def __init__(self, ai_provider=None):
        super().__init__()
        self.ai_provider = ai_provider
    
    def review_with_ai(self, code: str, file_name: str = "unknown", context: str = "") -> ReviewResult:
        """
        Perform AI-enhanced code review
        
        Args:
            code (str): The code to review
            file_name (str): Name of the file being reviewed
            context (str): Additional context about the code
        
        Returns:
            ReviewResult: Enhanced review result
        """
        # Start with basic review
        basic_result = self.review_code(code, file_name)
        
        # If AI provider is available, enhance the review
        if self.ai_provider:
            try:
                ai_analysis = self._get_ai_analysis(code, context)
                enhanced_result = self._merge_ai_analysis(basic_result, ai_analysis)
                return enhanced_result
            except Exception as e:
                logger.warning(f"AI analysis failed: {e}")
                return basic_result
        
        return basic_result
    
    def _get_ai_analysis(self, code: str, context: str) -> Dict[str, Any]:
        """Get AI analysis of the code"""
        # This would integrate with actual AI providers
        # For now, return mock analysis
        return {
            "ai_issues": [],
            "ai_suggestions": [],
            "complexity_score": 5,
            "maintainability_score": 7
        }
    
    def _merge_ai_analysis(self, basic_result: ReviewResult, ai_analysis: Dict[str, Any]) -> ReviewResult:
        """Merge AI analysis with basic review results"""
        # Enhance the basic result with AI insights
        enhanced_files = []
        
        for file_review in basic_result.files:
            enhanced_file = FileReview(
                file_name=file_review.file_name,
                status=file_review.status,
                score=file_review.score,
                issues=file_review.issues,
                suggestions=file_review.suggestions + ai_analysis.get("ai_suggestions", [])
            )
            enhanced_files.append(enhanced_file)
        
        return ReviewResult(
            overall_status=basic_result.overall_status,
            summary=basic_result.summary,
            score=basic_result.score,
            files=enhanced_files
        )


# Example usage and testing
if __name__ == "__main__":
    # Create reviewer instance
    reviewer = CodeReviewer()
    
    # Example code with various issues
    test_code = '''
import os
import pickle
from subprocess import call

def process_data(data):
    # TODO: Implement proper error handling
    result = []
    for i in range(len(data)):  # Inefficient iteration
        item = data[i]
        result.append(item)
    
    # Security issue: hardcoded password
    password = "secret123"
    
    # Bug: using == None
    if password == None:
        print("No password provided")
    
    # Performance: inefficient concatenation
    big_string = ""
    for item in result:
        big_string += str(item) + " "
    
    return result

def dangerous_function(user_input):
    # Critical security issue: eval
    eval(user_input)
    
    # Another security issue: shell=True
    call(f"echo {user_input}", shell=True)
    
    return True

class BadClass:
    def __init__(self, param1, param2, param3, param4, param5, param6):
        self.param1 = param1
        self.param2 = param2
        self.param3 = param3
        self.param4 = param4
        self.param5 = param5
        self.param6 = param6
'''
    
    # Perform review
    result = reviewer.review_code(test_code, "example.py")
    
    # Print results
    print("=== CODE REVIEW RESULTS ===")
    print(f"Overall Status: {result.overall_status}")
    print(f"Score: {result.score}/10")
    print(f"Summary: {result.summary}")
    print()
    
    if result.files:
        file_review = result.files[0]
        print(f"File: {file_review.file_name}")
        print(f"File Status: {file_review.status}")
        print(f"File Score: {file_review.score}/10")
        print(f"Issues Found: {len(file_review.issues)}")
        print()
        
        print("=== ISSUES ===")
        for issue in file_review.issues:
            print(f"Line {issue.line}: {issue.type.value} ({issue.severity.value})")
            print(f"  Description: {issue.description}")
            if issue.suggestion:
                print(f"  Suggestion: {issue.suggestion}")
            print()
        
        if file_review.suggestions:
            print("=== SUGGESTIONS ===")
            for suggestion in file_review.suggestions:
                print(f"- {suggestion}")
    
    # Test JSON output
    print("\n=== JSON OUTPUT ===")
    print(reviewer.to_json(result))
    
    # Test Markdown output
    print("\n=== MARKDOWN OUTPUT ===")
    print(reviewer.to_markdown(result))