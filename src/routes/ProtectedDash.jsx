import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { auth } from "../firebase/config";

const navItems = [
  { label: "Dashboard", to: "/" },
  { label: "Add Customer", to: "/add-customer" },
  { label: "Pick Winner", to: "/pickwinner" },
];

const ProtectedDash = () => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
      setIsCheckingAuth(false);
    });

    return unsubscribe;
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-6 py-16 text-[var(--text)]">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[var(--line)] bg-white/80 p-10 text-center shadow-[var(--shadow-soft)]">
          Checking admin session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin-login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 md:flex-row md:px-6">
        <aside className="w-full rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-soft)] md:sticky md:top-4 md:w-72 md:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
            Pry&apos;s
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Lucky Draw Admin</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Manage customer coupons, draw readiness, and <span onClick={()=> navigate('/internal-control/preset-winner-vault')} > winner </span> announcements
            from one panel.
          </p>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[var(--accent)] text-white shadow-lg"
                      : "bg-[var(--card)] text-[var(--text)] hover:bg-[var(--card-strong)]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProtectedDash;
