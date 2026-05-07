import { Outlet } from 'react-router-dom';
import Header from './Header';
import AgentHUD from '../agent/AgentHUD';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden text-gray-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f8fafc] flex relative">
          <Outlet />
        </main>
      </div>
      <AgentHUD />
    </div>
  );
}

