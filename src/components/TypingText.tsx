import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';

interface TypingTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  skip?: boolean;
  className?: string;
  showCursor?: boolean;
}

export const TypingText: React.FC<TypingTextProps> = ({ text, speed = 15, onComplete, skip = false, className, showCursor = false }) => {
  const [displayedText, setDisplayedText] = useState(skip ? text : '');
  const [currentIndex, setCurrentIndex] = useState(skip ? text.length : 0);
  const textRef = useRef(text);

  useEffect(() => {
    if (skip) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      return;
    }

    if (currentIndex < text.length) {
      const currentChar = text[currentIndex]!;
      let delay = speed;
      
      // Dynamic pauses based on cinematic typing rhythm
      if (currentChar === '.' || currentChar === '?' || currentChar === '!') {
        delay = speed * 6;
      } else if (currentChar === ',' || currentChar === ';' || currentChar === ':') {
        delay = speed * 3;
      } else if (currentChar === '\n') {
        delay = speed * 4;
      } else if (/\s/.test(currentChar)) {
        // Vary slightly on word boundaries
        delay = speed + (Math.random() * 10);
      }

      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + currentChar);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete, skip]);

  const isTyping = currentIndex < text.length;
  const displayed = showCursor && isTyping ? `${displayedText} ▍` : displayedText;

  return (
    <div className={`markdown-body prose prose-invert max-w-none text-sm prose-p:leading-relaxed ${className || ''}`}>
      <Markdown>{displayed}</Markdown>
    </div>
  );
};
