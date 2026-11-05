import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CornerDownLeft, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { ConversationMessage } from '../types/prd';

interface ChatPanelProps {
  messages: ConversationMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onApplyFixes?: () => Promise<void>;
  hasRequiredFindings?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onApplyFixes,
  hasRequiredFindings,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const text = inputText.trim();
    if (text.length > 5000) {
      alert('메시지는 최대 5,000자까지 입력 가능합니다.');
      return;
    }

    setInputText('');
    await onSendMessage(text);
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
          <Bot className="w-4 h-4 text-neutral-600" />
          <span>대화 및 수정 요청</span>
        </div>
        <span className="text-[11px] text-neutral-400 font-mono">
          {messages.length}개 메시지
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
              <Bot className="w-4 h-4" />
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              PRD에 관해 궁금한 점을 질문하거나, 요구사항 변경 및 수정을 요청할 수 있습니다.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-neutral-900 text-white rounded-tr-xs'
                      : 'bg-neutral-100 text-neutral-800 rounded-tl-xs border border-neutral-200/60'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Render questions if assistant asked any */}
                  {msg.questions && msg.questions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-neutral-200 space-y-2">
                      <div className="text-[11px] font-semibold text-neutral-700">
                        진행을 위해 확인이 필요한 질문:
                      </div>
                      {msg.questions.map((q) => (
                        <div
                          key={q.id}
                          className="p-2.5 bg-white rounded-lg border border-neutral-200 text-neutral-800 space-y-1"
                        >
                          <div className="font-medium text-xs">{q.text}</div>
                          <div className="text-[10px] text-neutral-400">이유: {q.reason}</div>
                          <button
                            onClick={() => {
                              setInputText(`[답변: ${q.text}] `);
                            }}
                            className="text-[11px] text-neutral-700 underline hover:text-neutral-900 font-medium pt-0.5"
                          >
                            이 질문에 답변하기
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1 font-mono ${
                      isUser ? 'text-neutral-400 text-right' : 'text-neutral-400'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {isUser && (
                  <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-neutral-100 rounded-xl rounded-tl-xs px-3.5 py-2.5 text-xs text-neutral-500 border border-neutral-200/60 flex items-center gap-2">
              <RefreshCw className="w-3 h-3 animate-spin text-neutral-600" />
              <span>AI가 분석 및 응답을 작성하고 있습니다...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Challenge Pills (Section 4.3) */}
      <div className="px-3 py-2 border-t border-neutral-100 bg-neutral-50/70 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => handleQuickPrompt('현재 문서가 기준상 충분한가요?')}
          disabled={isLoading}
          className="text-[11px] px-2.5 py-1 bg-white border border-neutral-200 rounded-md text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 transition-colors"
        >
          충분해?
        </button>

        <button
          type="button"
          onClick={() => handleQuickPrompt('빠지거나 모순된 논리가 있는지 강하게 반박해줘')}
          disabled={isLoading}
          className="text-[11px] px-2.5 py-1 bg-white border border-neutral-200 rounded-md text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 transition-colors"
        >
          논리 반박해줘
        </button>

        {hasRequiredFindings && onApplyFixes && (
          <button
            type="button"
            onClick={onApplyFixes}
            disabled={isLoading}
            className="text-[11px] px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md text-amber-800 hover:bg-amber-100 font-medium transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>필수 보완 반영</span>
          </button>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 border-t border-neutral-200 bg-white">
        <div className="relative">
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="수정 요청이나 질문을 입력하세요... (Enter로 전송, Shift+Enter 줄바꿈)"
            disabled={isLoading}
            className="w-full text-xs p-2.5 pr-8 border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none disabled:bg-neutral-50"
          />

          <div className="flex items-center justify-between mt-1 text-[10px] text-neutral-400">
            <span className="font-mono">{inputText.length} / 5,000자</span>
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="flex items-center gap-1 px-3 py-1 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors disabled:bg-neutral-300 text-xs font-medium"
            >
              <span>전송</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
