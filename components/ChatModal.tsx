import React, { useState, useRef, useEffect } from 'react';
import { UserData, ChatMessage } from '../types';
import { generateChatResponseStream } from '../services/gemini';
import { logToChatHistory } from '../services/supabase';
import { SendIcon, BotIcon } from './Icons';

interface ChatModalProps {
  userData: UserData;
  onClose: () => void;
}

const quickSuggestions = [
  "Suggest a workout for today",
  "Give me a healthy meal tip",
  "How can I improve my posture?",
];

const ChatModal: React.FC<ChatModalProps> = ({ userData, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'assistant', text: `Hi ${userData.email?.split('@')[0] || 'there'}! I'm your AI Fitness Coach. How can I help with your goals today?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (textToSend.trim() === '' || isLoading) return;

    const userMessage: ChatMessage = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    logToChatHistory(userData.id, textToSend, 'user');
    
    if (!messageText) {
        setInput('');
    }
    setIsLoading(true);

    // Add a placeholder for the streaming AI response
    setMessages(prev => [...prev, { sender: 'assistant', text: '' }]);

    try {
      const stream = await generateChatResponseStream(textToSend, messages, userData);
      let fullResponse = '';
      for await (const chunk of stream) {
        // Remove markdown asterisks for bolding
        const cleanedText = chunk.text.replace(/\*\*/g, '');
        fullResponse += cleanedText;
        
        // Stream the response letter by letter for a typewriter effect
        for (const char of cleanedText) {
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                newMessages[newMessages.length - 1] = { ...lastMessage, text: lastMessage.text + char };
                return newMessages;
            });
            await new Promise(r => setTimeout(r, 10));
        }
      }
      logToChatHistory(userData.id, fullResponse, 'assistant');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sorry, I couldn't connect.";
      setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { sender: 'assistant', text: errorMessage };
          return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-gray-900 w-full max-w-md h-[90vh] rounded-t-2xl flex flex-col font-sans shadow-2xl">
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <BotIcon className="w-6 h-6 text-teal-400"/>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Fitness Coach</h2>
              <p className="text-xs text-teal-400">Online</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-light">&times;</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg, index) => {
            if (msg.sender === 'assistant') {
              return (
                <div key={index} className="flex items-end gap-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <BotIcon className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="bg-gray-700 text-white rounded-2xl rounded-bl-none px-4 py-3 max-w-xs lg:max-w-md whitespace-pre-wrap">
                        {msg.text}
                        {isLoading && index === messages.length - 1 && <span className="inline-block w-1 h-4 bg-white animate-pulse ml-1 align-bottom"></span>}
                    </div>
                </div>
              );
            }
            return (
              <div key={index} className="flex justify-end">
                  <div className="bg-teal-500 text-white rounded-2xl rounded-br-none px-4 py-3 max-w-xs lg:max-w-md whitespace-pre-wrap">
                      {msg.text}
                  </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900">
          {!isLoading && messages.length < 3 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {quickSuggestions.map(q => (
                  <button 
                      key={q} 
                      onClick={() => handleSend(q)}
                      className="px-4 py-2 bg-gray-700 text-teal-300 text-sm rounded-full whitespace-nowrap hover:bg-gray-600 transition"
                  >
                      {q}
                  </button>
              ))}
            </div>
          )}
          <div className="flex items-center bg-gray-700 rounded-full">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask your coach..."
              className="flex-1 bg-transparent px-5 py-3 text-white focus:outline-none placeholder-gray-400"
            />
            <button onClick={() => handleSend()} className="p-3 text-teal-400 disabled:text-gray-500" disabled={isLoading || !input.trim()}>
              <SendIcon className="w-6 h-6"/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
