import { UserButton, useUser } from "@clerk/react";
import { ChevronRight, ClipboardPlus, History, LayoutDashboard } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const navigation = [
  { to: "/dashboard", label: "My tests", icon: LayoutDashboard },
  { to: "/create", label: "Import a test", icon: ClipboardPlus },
  { to: "/history", label: "Attempt history", icon: History },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "My tests",
  "/create": "Import a test",
  "/history": "Attempt history",
};

export function WorkspaceLayout() {
  const location = useLocation();
  const { user } = useUser();
  const pageTitle = location.pathname.startsWith("/result/") ? "Result review" : pageTitles[location.pathname] ?? "MockTest";
  const displayName = user?.firstName ?? "Student";

  return (
    <div className="workspace-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <NavLink className="brand-lockup" to="/dashboard">
          <img className="brand-logo" src="/mocktest.png" alt="MockTest" />
        </NavLink>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-nav">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              {to === "/dashboard" && <ChevronRight className="nav-arrow" size={15} aria-hidden="true" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-account">
            <UserButton />
            <div className="account-label"><span className="account-name">{displayName}</span><span className="account-subtitle">Your account</span></div>
          </div>
          <p className="sidebar-note">A clear space to practice.</p>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="mobile-brand"><img className="brand-logo" src="/mocktest.png" alt="MockTest" /></div>
          <span className="topbar-title">{pageTitle}</span>
          <div className="topbar-user"><span>{displayName}</span><UserButton /></div>
        </header>
        <main className="workspace-content"><Outlet /></main>
      </div>

      <nav className="mobile-nav" aria-label="Main navigation">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}>
            <Icon size={19} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
