import React from 'react';
import { Bell, MessageSquare, Info } from 'lucide-react';

export default function NotificationBanner({ message, time }) {
  if (!message) return null;

  return (
    <div className="notification-banner">
      <MessageSquare size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <span className="notification-badge-mock">Simulated Notification</span>
          {time && <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>{time}</span>}
        </div>
        <p style={{ margin: 0, lineHeight: 1.4 }}>{message}</p>
      </div>
    </div>
  );
}
