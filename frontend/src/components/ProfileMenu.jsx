import { useEffect, useRef, useState } from 'react';

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfileMenu({ user, roleLabel, onChangePassword, onLogout }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handlePassword = () => {
    setOpen(false);
    onChangePassword?.();
  };

  const handleLogout = () => {
    setOpen(false);
    onLogout?.();
  };

  return (
    <div className="profile-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="profile-menu-trigger nav-user-identity"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={`${user.fullName} · ${roleLabel}`}
      >
        <div className="avatar">{initials(user.fullName)}</div>
        <div className="nav-user-text">
          <span className="nav-user-name">{user.fullName}</span>
          <span className="nav-user-role">{roleLabel}</span>
        </div>
        <span className="profile-menu-chevron" aria-hidden>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <>
          <div className="profile-menu-backdrop" onClick={() => setOpen(false)} aria-hidden />
          <div className="profile-menu-panel" role="menu" aria-label="Profile menu">
            <div className="profile-menu-header">
              <div className="profile-menu-avatar">{initials(user.fullName)}</div>
              <div className="profile-menu-meta">
                <strong>{user.fullName}</strong>
                <span>{roleLabel}</span>
                {user.email && <span className="profile-menu-email">{user.email}</span>}
                {user.employeeId && (
                  <span className="profile-menu-id">ID: {user.employeeId}</span>
                )}
              </div>
            </div>
            <button type="button" className="profile-menu-item" role="menuitem" onClick={handlePassword}>
              <span aria-hidden>🔑</span> Update password
            </button>
            <button type="button" className="profile-menu-item danger" role="menuitem" onClick={handleLogout}>
              <span aria-hidden>🚪</span> Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
