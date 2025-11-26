"use client";

import { useEffect, useState, useRef, memo } from "react";

import { useChatContext } from "./ChatContext";

interface TypewriterTextProps {
  text: string;
  speed?: number; // Milliseconds per character
  children: (displayedText: string) => React.ReactNode;
}

/**
 * TypewriterText component - displays text with a typewriter effect.
 * Animates character by character, even during streaming, to create
 * a smooth typewriter effect.
 */
export const TypewriterText = memo(function TypewriterText({
  text,
  speed = 20, // Default: 20ms per character (50 chars/sec)
  children,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const targetLengthRef = useRef(0);
  const isStoppedRef = useRef(false);
  const previousTextRef = useRef("");
  const { setIsChatbotTyping, chatIsStopped } = useChatContext();

  // Reset stopped state when text changes (new message)
  useEffect(() => {
    if (text !== previousTextRef.current) {
      isStoppedRef.current = false;
      previousTextRef.current = text;
    }
  }, [text]);

  // Mark as stopped when chatIsStopped becomes true
  useEffect(() => {
    if (chatIsStopped) {
      isStoppedRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsChatbotTyping(false);
    }
  }, [chatIsStopped, setIsChatbotTyping]);

  useEffect(() => {
    // Don't start or continue if this instance was stopped
    if (isStoppedRef.current) {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (text.length === 0) {
      setDisplayedText("");
      targetLengthRef.current = 0;
      setIsChatbotTyping(false);
      return;
    }

    // Update target length
    targetLengthRef.current = text.length;

    // If we're already at or past the target, just set it
    if (displayedText.length >= text.length) {
      setDisplayedText(text);
      setIsChatbotTyping(false);
      return;
    }

    // Set typing to true when starting animation
    setIsChatbotTyping(true);

    // Animate from current length to target length
    let currentIndex = displayedText.length;

    intervalRef.current = setInterval(() => {
      if (
        currentIndex < targetLengthRef.current &&
        !chatIsStopped &&
        !isStoppedRef.current
      ) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
        setIsChatbotTyping(true);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsChatbotTyping(false);
        }
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsChatbotTyping(false);
    };
  }, [text, speed, setIsChatbotTyping, chatIsStopped, displayedText.length]);

  return <>{children(displayedText)}</>;
});
