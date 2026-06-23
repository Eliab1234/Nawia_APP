import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatbotWidget } from './ChatbotWidget';

export const Layout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem('sidebar-collapsed') === 'true'
  );

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      localStorage.setItem('sidebar-collapsed', !prev);
      return !prev;
    });
  };

  return (
    <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      <main className="main-content">
        {children}
      </main>
      <ChatbotWidget />
    </div>
  );
};
export default Layout;
