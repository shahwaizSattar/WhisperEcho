import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Flag, 
  FileText, 
  Users, 
  Shield, 
  FileCheck, 
  LogOut 
} from 'lucide-react';
import adminAuth from '../utils/auth';
import './Layout.css';

const Layout = ({ setIsAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    adminAuth.logout();
    setIsAuthenticated(false);
    navigate('/admin/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/reports', icon: Flag, label: 'Reports' },
    { path: '/posts', icon: FileText, label: 'Posts' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/moderation-rules', icon: Shield, label: 'Moderation Rules' },
    { path: '/logs', icon: FileCheck, label: 'Admin Logs' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>WhisperEcho</h1>
          <p>Admin Panel</p>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
