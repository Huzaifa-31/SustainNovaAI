"use client";

import { useParams } from "next/navigation";
import { useState, useRef, useEffect, FormEvent } from "react";
import {
  useChatHistory,
  useAskQuestion,
  useClearChatHistory,
  ChatMessageRecord,
  ChatSource,
} from "@/hooks/useQA";

// --- Source Citation ---

function SourceBadge({ source, index }: { source: ChatSource; index: number }) {
  const [showSnippet, setShowSnippet] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowSnippet(!showSnippet)}
        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
      >
        <span className="font-semibold text-indigo-600">[{index + 1}]</span>
        {source.documentName ? (
          <span className="max-w-32 truncate">{source.documentName}</span>
        ) : (
          <span className="text-gray-400">Source</span>
        )}
        <span className="text-gray-400">
          p.{source.pageStart}
          {source.pageEnd > source.pageStart ? `-${source.pageEnd}` : ""}
        </span>
      </button>
      {showSnippet && (
        <div className="absolute z-10 mt-1 w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="mb-1 text-xs font-semibold text-gray-500">
            {source.documentName} — Page {source.pageStart}
          </p>
          <p className="max-h-32 overflow-y-auto text-xs text-gray-600">
            {source.textSnippet}
          </p>
          <div className="mt-1 text-xs text-gray-400">
            Relevance: {Math.round(source.score * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}

// --- Message Bubble ---

function MessageBubble({ message }: { message: ChatMessageRecord }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-white border border-gray-200 text-gray-800"
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 border-t border-gray-100 pt-2">
            <p className="mb-1 text-xs font-medium text-gray-400">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {message.sources.map((source, i) => (
                <SourceBadge key={i} source={source} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p
          className={`mt-1 text-xs ${isUser ? "text-indigo-200" : "text-gray-400"}`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

// --- Typing Indicator ---

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function QAPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages, isLoading: historyLoading } = useChatHistory(auditId);
  const askQuestion = useAskQuestion();
  const clearHistory = useClearChatHistory();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, askQuestion.isPending]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || askQuestion.isPending) return;
    setQuestion("");
    await askQuestion.mutateAsync({ auditId, question: trimmed });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClear = async () => {
    if (window.confirm("Clear all chat history? This cannot be undone.")) {
      await clearHistory.mutateAsync({ auditId });
    }
  };

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[500px] flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          <p className="text-xs text-gray-500">
            Ask questions about your audit documents. Answers are grounded in your uploaded evidence.
          </p>
        </div>
        {messages && messages.length > 0 && (
          <button
            onClick={handleClear}
            disabled={clearHistory.isPending}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Clear history
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
        {historyLoading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Loading chat...</p>
          </div>
        )}

        {!historyLoading && (!messages || messages.length === 0) && !askQuestion.isPending && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 text-4xl">🔍</div>
            <h4 className="mb-1 font-medium text-gray-700">
              Ask anything about your audit
            </h4>
            <p className="max-w-md text-sm text-gray-500">
              Try questions like &ldquo;What are the main findings?&rdquo;, &ldquo;What
              corrective actions are needed for overtime issues?&rdquo;, or
              &ldquo;Summarize the safety risks identified.&rdquo;
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                "What are the critical findings?",
                "Summarize all safety issues",
                "What corrective actions are needed?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setQuestion(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages && messages.length > 0 && (
          <div className="space-y-3">
            {messages.map((msg) => (
              <MessageBubble key={msg._id} message={msg} />
            ))}
          </div>
        )}

        {askQuestion.isPending && <TypingIndicator />}

        {/* Pending user message (optimistic) */}
        {askQuestion.isPending && question === "" && (
          <div className="mt-3" />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {askQuestion.isError && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">Failed to get response</p>
          <p className="mt-1">
            {askQuestion.error instanceof Error
              ? askQuestion.error.message
              : "Unknown error"}
          </p>
          {askQuestion.error instanceof Error &&
            askQuestion.error.message.includes("quota") && (
              <p className="mt-1 text-xs">
                You may have hit the Gemini free tier daily request limit. Try
                again in a few minutes, or use a different API key.
              </p>
            )}
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your audit documents..."
          rows={2}
          disabled={askQuestion.isPending}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!question.trim() || askQuestion.isPending}
          className="self-end rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600"
        >
          {askQuestion.isPending ? (
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
}
