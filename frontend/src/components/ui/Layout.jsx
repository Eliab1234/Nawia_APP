import React from 'react';
import { Sidebar } from './Sidebar';
import { ChatbotWidget } from './ChatbotWidget';

export const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
      <ChatbotWidget />
    </div>
  );
};
export default Layout;
