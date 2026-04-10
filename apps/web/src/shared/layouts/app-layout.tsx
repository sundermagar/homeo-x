import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './components/sidebar';
import { GlobalHeader } from './components/header';

export function AppLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Sidebar gets the open state and the close handler */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content area */}
      <main className="app-main">
        <GlobalHeader onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
