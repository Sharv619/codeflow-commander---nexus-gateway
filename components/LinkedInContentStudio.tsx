import React, { useState, useEffect } from 'react';
import { AiOutlineSend, AiOutlineCopy, AiOutlineLike, AiOutlineMessage, AiOutlineShareAlt } from 'react-icons/ai';
import { BsLinkedin, BsCalendarEvent, BsCheckCircle, BsArrowRepeat } from 'react-icons/bs';

interface ContentItem {
  id: string;
  topic: string;
  date: string;
  status: string;
  context: string;
  linkedInUrl?: string;
  generatedContent?: string;
}

export default function LinkedInContentStudio() {
  const [currentItem, setCurrentItem] = useState<ContentItem | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  // Simulated data - in real app, fetch from Notion API
  useEffect(() => {
    // This would be a fetch from your Notion API
    const nextItem: ContentItem = {
      id: 'phase-1',
      topic: 'Phase 1: Intelligent Code Analysis Foundation',
      date: '2025-10-23',
      status: 'To Do',
      context: 'Focus: Transforming traditional code quality tools into intelligent, context-aware development companions\nCTA: From static analysis to AI-powered understanding',
      linkedInUrl: ''
    };
    setCurrentItem(nextItem);
  }, []);

  const generatePersonalContent = async () => {
    if (!currentItem) return;

    setIsLoading(true);
    try {
      // Simulate AI content generation with personal touch
      const prompt = `Write a personal LinkedIn post about "${currentItem.topic}" as a developer/engineer who conceptualized and built this phase of our project. Make it authentic and storytelling-driven rather than promotional. Share the journey of transforming traditional development practices, the technical challenges overcome, and how this phase represents a fundamental shift in how we approach software engineering. Focus on the evolution from traditional to intelligent development practices.

      Context: ${currentItem.context}

      Style: Personal storytelling, technical insight, visionary thinking, genuine passion for innovation. 280 characters max.`;

      // In real implementation, this would call your AI API
      const personalContent = `"The journey from static analysis to intelligent code understanding is finally complete. 🎯

      For years, traditional linters just flagged issues without understanding context. But ${currentItem.topic} changes everything - we built tools that actually comprehend code like developers do.

      The challenge? Teaching machines to understand architectural patterns, team conventions, and the subtle art of what constitutes "good code" beyond syntax rules.

      Now our CI/CD pipeline doesn't just catch bugs - it provides contextual suggestions that make developers better. The false positives that wasted hours? Gone. The deep insights that transform how we write software? Here.

      This is the foundation that enables everything else we build. What's your vision for the future of development tools? I'm genuinely curious. 👨‍💻✨

      (From static to intelligent - our ${currentItem.topic})"

      #CodeflowHook #SoftwareEngineering #AIDevelopment #DeveloperTools`;

      setGeneratedContent(personalContent);
    } catch (error) {
      console.error('Content generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback('✅ Copied to clipboard!');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const postToLinkedIn = async () => {
    if (!generatedContent) return;

    setIsPosting(true);
    try {
      // In real implementation, this would be LinkedIn API or redirect to LinkedIn posting
      console.log('Posting to LinkedIn:', generatedContent);

      // For now, just open LinkedIn in a new tab with the content
      const linkedinUrl = `https://linkedin.com/feed/update/urn:li:activity:${Date.now()}/`;
      window.open(linkedinUrl, '_blank');

      // Would also update Notion status here in real implementation
      alert('Content copied to clipboard! Now paste and post on LinkedIn.');

    } catch (error) {
      console.error('Posting failed:', error);
      alert('Posting failed. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <BsLinkedin {...({} as any)} className="text-2xl" />
          <h1 className="text-2xl font-bold">LinkedIn Content Studio</h1>
        </div>
        <p className="text-lg opacity-90">
          Create authentic content explaining our project phases and vision
        </p>
      </div>

      {/* Current Task Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <BsCalendarEvent {...({} as any)} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{currentItem.topic}</h2>
              <p className="text-sm text-gray-500">Scheduled for {currentItem.date}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            currentItem.status === 'To Do'
              ? 'bg-yellow-100 text-yellow-800'
              : currentItem.status === 'Posted'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {currentItem.status}
          </span>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-medium text-gray-900 mb-2">Context & Focus</h3>
          <p className="text-gray-700 whitespace-pre-line">{currentItem.context}</p>
        </div>

        {/* Generate Content Button */}
        {!generatedContent && (
          <button
            onClick={generatePersonalContent}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating personal content...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                🤖 Generate Personal Content
              </div>
            )}
          </button>
        )}

        {/* Generated Content */}
        {generatedContent && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">✨ Personal Content Ready</h3>
              <div className="bg-white p-4 rounded border whitespace-pre-wrap text-gray-800">
                {generatedContent}
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => copyToClipboard(generatedContent)}
                  className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  <AiOutlineCopy />
                  Copy
                </button>

                {copyFeedback && (
                  <span className="flex items-center gap-2 text-green-600 font-medium">
                    {copyFeedback}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={postToLinkedIn}
                disabled={isPosting}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isPosting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Opening LinkedIn...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <AiOutlineSend />
                    Post to LinkedIn
                  </div>
                )}
              </button>

              <button
                className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <BsArrowRepeat />
                Regenerate
              </button>

              <button
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                <BsCheckCircle />
                Mark Complete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {generatedContent && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AiOutlineMessage />
            LinkedIn Preview
          </h3>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="max-w-md">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  C
                </div>
                <div className="flex-1">
                  <div className="font-medium">Codeflow Commander</div>
                  <div className="text-sm text-gray-500">Technology Company</div>
                  <div className="text-xs text-gray-400">• Just now</div>
                </div>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {generatedContent}
              </div>
              <div className="flex items-center gap-6 mt-4 text-gray-500">
                <AiOutlineLike {...({} as any)} className="text-lg" />
                <AiOutlineMessage {...({} as any)} className="text-lg" />
                <AiOutlineShareAlt {...({} as any)} className="text-lg" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
