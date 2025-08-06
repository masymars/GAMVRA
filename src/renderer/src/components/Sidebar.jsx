import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  BrainCircuit, HeartPulse, LayoutDashboard, Calendar, 
  Users, Database, Settings, ChevronLeft, ChevronRight,
  Stethoscope, History, Pill
} from 'lucide-react';
import '../assets/Sidebar.css';
import appIcon from '../assets/icon.png';

const Sidebar = ({ isOpen, toggleSidebar, userData }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  
  return (
    <div className={`sidebar ${isOpen ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className={`logo-container ${isOpen ? '' : 'justify-center w-full'}`}>
          <img src={appIcon} alt="GAMVRA" className="app-logo" />
          {isOpen && (
            <div className="logo-text">
              <h1 className="text-xl font-bold">GAMVRA</h1>
              <span className="tagline">Medical Assistant</span>
            </div>
          )}
        </div>
        <button 
          onClick={toggleSidebar}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"} 
          className="toggle-button"
        >
          {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
      
      <nav className="nav-menu">
        <NavLink 
          to="/" 
          className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}
          title="Dashboard"
        >
          <div className="nav-icon">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          {isOpen && <span className="nav-text">Dashboard</span>}
        </NavLink>
        

    <NavLink 
          to="/session" 
          className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}
          title="Patient Session"
        >
          <div className="nav-icon">
            <Stethoscope className="w-5 h-5" />
          </div>
          {isOpen && <span className="nav-text">Patient Session</span>}
        </NavLink>

        <NavLink 
          to="/chat" 
          className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}
          title="AI Assistant"
        >
          <div className="nav-icon">
            <BrainCircuit className="w-5 h-5" />
          </div>
          {isOpen && <span className="nav-text">AI Assistant</span>}
        </NavLink>
        
       
        
        <NavLink 
          to="/calendar" 
          className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}
          title="Schedule"
        >
          <div className="nav-icon">
            <Calendar className="w-5 h-5" />
          </div>
          {isOpen && <span className="nav-text">Schedule</span>}
        </NavLink>
    
        
        <NavLink 
          to="/records" 
          className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}
          title="Records"
        >
          <div className="nav-icon">
            <Database className="w-5 h-5" />
          </div>
          {isOpen && <span className="nav-text">Records</span>}
        </NavLink>
        
        <NavLink 
          to="/prescriptions" 
          className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}
          title="Prescriptions"
        >
          <div className="nav-icon">
            <Pill className="w-5 h-5" />
          </div>
          {isOpen && <span className="nav-text">Prescriptions</span>}
        </NavLink>
        
     <NavLink 
          to="/conversations" 
          className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}
          title="Conversation History"
        >
          <div className="nav-icon">
            <History className="w-5 h-5" />
          </div>
          {isOpen && <span className="nav-text">History</span>}
        </NavLink>
      </nav>
      
      <div className="sidebar-footer">
        <NavLink 
          to="/settings" 
          className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}
          title="Settings"
        >
          <div className="nav-icon">
            <Settings className="w-5 h-5" />
          </div>
          {isOpen && <span className="nav-text">Settings</span>}
        </NavLink>
        
        <div className="user-status">
          {isOpen && (
            <>
              <div className="user-avatar">
                <span>{userData?.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : "DR"}</span>
              </div>
              <div className="user-info">
                <span className="user-name">{userData?.name || "Guest User"}</span>
                <span className="user-role">{userData?.role || "User"}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
