import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="app-layout">
      {/* TODO: GlobalHeader, Sidebar, CommandPalette */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
