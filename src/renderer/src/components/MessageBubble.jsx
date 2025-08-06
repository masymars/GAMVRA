import React from 'react';
import { User, BotMessageSquare, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const MessageBubble = ({ message }) => {
  const { role, content, imageUrl, isNotification } = message;

  const isUser = role === 'user';
  const isSystemNotification = role === 'system' && isNotification;
  const isAssistant = !isUser && !isSystemNotification;

  const containerClasses = `flex items-start ${isUser ? 'justify-end' : 'justify-start'}`;

  // Use a wrapper for the icon and bubble to handle alignment correctly
  const messageWrapperClasses = `flex items-start max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`;

  const bubbleClasses = `rounded-lg p-4 ${isUser ? 'bg-primary-100 text-primary-800' : 'bg-white border border-primary-200 shadow-sm text-primary-900'} ${isUser ? 'mr-3' : 'ml-3'}`;
  
  const iconClasses = 'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center';

  const renderContent = () => {
    // For the assistant, render markdown with special styling for code blocks.
    if (isAssistant) {
      return (
        <article className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            children={content}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    PreTag="div"
                    language={match[1]}
                    children={String(children).replace(/\n$/, '')}
                    {...props}
                  />
                ) : (
                  <code className="bg-gray-200 text-gray-800 rounded px-1 py-0.5" {...props}>
                    {children}
                  </code>
                );
              }
            }}
          />
        </article>
      );
    }

    // For user messages, we also use ReactMarkdown.
    // This will render new paragraphs for newlines (from blank lines in the input) 
    // and format **bolded text** correctly.
    // It doesn't use the `prose` class, so it inherits the text color from `bubbleClasses`.
    if (isUser) {
        return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    }
    
    // For system messages, just return the plain text content.
    return content;
  };

  if (isSystemNotification) {
    return (
        <div className="flex justify-center">
            <div className='bg-primary-50 text-primary-600 border border-primary-200 rounded-full px-4 py-2 text-sm font-medium flex items-center'>
                <Database className="w-4 h-4 mr-2 text-primary-500" />
                {content}
            </div>
        </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className={messageWrapperClasses}>
        <div className={`${iconClasses} ${isUser ? 'bg-primary-200' : 'bg-primary-600'}`}>
          {isUser ? <User className="w-5 h-5 text-primary-700" /> : <BotMessageSquare className="w-5 h-5 text-white" />}
        </div>
        <div className={bubbleClasses}>
          {renderContent()}
          {imageUrl && (
            <div className="mt-3">
              <img src={imageUrl} alt="Uploaded medical image" className="max-h-64 rounded-lg border border-primary-200" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
