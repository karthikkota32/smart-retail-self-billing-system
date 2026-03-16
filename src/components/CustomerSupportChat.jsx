import React, { useState, useEffect, useRef, useCallback } from "react";
import { sendChatMessage, getChatMessages } from "../services/api";
import "../styles/CustomerSupportChat.css";

const CustomerSupportChat = ({ userId, username, isAdmin = false }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getChatMessages(userId, 100);
      if (data.success) {
        setMessages(data.messages);
        // Count unread messages (from admin if user, or any if admin)
        if (!isOpen) {
          const unread = data.messages.filter((msg) => 
            isAdmin ? !msg.is_admin : msg.is_admin
          ).length;
          setUnreadCount(unread);
        }
      }
    } catch (err) {
      console.error("Failed to fetch chat messages:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin, isOpen]);

  useEffect(() => {
    if (userId) {
      fetchMessages();
      // Poll for new messages every 5 seconds
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [userId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const data = await sendChatMessage(userId, username, newMessage, isAdmin);
      
      if (data.success) {
        setNewMessage("");
        // Add message to local state immediately
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  if (!userId) return null;

  return (
    <div className={`customer-support-chat ${isOpen ? "open" : "closed"}`}>
      <button className="chat-toggle-btn" onClick={toggleChat}>
        <span className="chat-icon">💬</span>
        {!isOpen && unreadCount > 0 && (
          <span className="unread-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h4>
              {isAdmin ? "Customer Support - Admin" : "Customer Support"}
            </h4>
            <button className="close-chat-btn" onClick={toggleChat}>
              ✕
            </button>
          </div>

          <div className="chat-messages" ref={chatContainerRef}>
            {loading && messages.length === 0 ? (
              <div className="chat-loading">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="empty-chat">
                <span className="empty-icon">💬</span>
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`message ${msg.is_admin ? "admin-message" : "user-message"}`}
                  >
                    <div className="message-header">
                      <span className="message-sender">
                        {msg.is_admin ? "Support Team" : msg.username}
                      </span>
                      <span className="message-time">{formatTime(msg.created_at)}</span>
                    </div>
                    <div className="message-content">{msg.message}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="chat-input"
              disabled={sending}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={sending || !newMessage.trim()}
            >
              {sending ? "⏳" : "📤"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CustomerSupportChat;
