"use client";

import { useEffect, useState, useRef, memo } from "react";

import { useTypewriterContext } from "./ChatContext";

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
  // Guard against 0/negative speeds which would make setInterval misbehave.
  const safeSpeed = Math.max(1, speed);
  const [displayedText, setDisplayedText] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const displayedLengthRef = useRef(0);
  const isStoppedRef = useRef(false);
  const previousTextRef = useRef("");
  const { setIsChatbotTyping, chatIsStopped } = useTypewriterContext();

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
      displayedLengthRef.current = 0;
      setIsChatbotTyping(false);
      return;
    }

    // If we're already at or past the target, just set it
    if (displayedLengthRef.current >= text.length) {
      setDisplayedText(text);
      setIsChatbotTyping(false);
      return;
    }

    // Set typing to true when starting animation
    setIsChatbotTyping(true);

    // Animate from current length to target length
    let currentIndex = displayedLengthRef.current;

    intervalRef.current = setInterval(() => {
      if (
        currentIndex < text.length &&
        !chatIsStopped &&
        !isStoppedRef.current
      ) {
        currentIndex++;
        displayedLengthRef.current = currentIndex;
        setDisplayedText(text.slice(0, currentIndex));
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsChatbotTyping(false);
        }
      }
    }, safeSpeed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsChatbotTyping(false);
    };
    // displayedText.length removed — tracked via displayedLengthRef to avoid
    // re-triggering this effect on every character update.
  }, [text, safeSpeed, setIsChatbotTyping, chatIsStopped]);

  return <>{children(displayedText)}</>;
});
