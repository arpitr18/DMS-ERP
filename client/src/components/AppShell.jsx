import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  Store,
  BadgeIndianRupee,
  ShoppingCart,
  Boxes,
  WalletCards,
  CircleDollarSign,
  ChartNoAxesCombined,
  FileBarChart,
  Menu,
  X,
  LogOut,
  MoreHorizontal,
  History,
  UserRound,
  ChevronDown,
} from "lucide-react";
import { clearSession, getUser } from "../lib/api";

const dashboard = ["Dashboard", "/", LayoutDashboard];
const billing = [["Create Bills", "/billing", ReceiptText], ["Billing History", "/bills", History]];
const master = [["Product", "/products", Package], ["Retailer", "/retailers", Store], ["Selling Master", "/selling-master", BadgeIndianRupee], ["Beat Master", "/beats", Store], ["Salesmen", "/salesmen", UserRound]];
const data = [["Profits", "/profits", ChartNoAxesCombined], ["Reports", "/reports", FileBarChart]];
const standalone = [["Purchases", "/purchases", ShoppingCart], ["Inventory", "/inventory", Boxes], ["Collections", "/collections", WalletCards], ["Expenses", "/expenses", CircleDollarSign]];
const mobileMain = [dashboard, ...billing];

function NavItems({ close }) {
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState({});
  useEffect(() => {
    const group = [["Master", master], ["Billings", billing], ["Data", data]].find(([, items]) => items.some(([, path]) => path === pathname));
    if (group) setExpanded(previous => ({ ...previous, [group[0]]: true }));
  }, [pathname]);
  function link([label, path, Icon]) {
    return <NavLink key={path} to={path} end={path === "/"} onClick={close}
      className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
      <Icon size={18}/><span>{label}</span>
    </NavLink>;
  }
  function group(label, items, Icon) {
    const active = items.some(([, path]) => path === pathname);
    return <div key={label}>
      <button type="button" aria-expanded={Boolean(expanded[label])} onClick={() => setExpanded(previous => ({ ...previous, [label]: !previous[label] }))}
        className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-slate-100 ${active ? "text-slate-950" : "text-slate-600"}`}>
        <Icon size={18}/><span>{label}</span><ChevronDown size={16} className={`ml-auto transition-transform ${expanded[label] ? "rotate-180" : ""}`}/>
      </button>
      {expanded[label] && <div className="ml-5 space-y-1 border-l border-slate-200 pl-2">{items.map(link)}</div>}
    </div>;
  }
  return <nav className="space-y-1">{link(dashboard)}{group("Master", master, Package)}{group("Billings", billing, ReceiptText)}{standalone.map(link)}{group("Data", data, FileBarChart)}</nav>;
}

export default function AppShell() {
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser);
  useEffect(() => {
    const syncUser = () => setUser(getUser());
    window.addEventListener("dm_session_changed", syncUser);
    return () => window.removeEventListener("dm_session_changed", syncUser);
  }, []);
  const logout = () => {
    clearSession();
    navigate("/login");
  };
  const openProfile = () => {
    setDrawer(false);
    navigate("/profile");
  };
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-hidden border-r border-slate-200 bg-white lg:flex">
        <div className="shrink-0 px-6 pb-5 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Distribution
          </p>
          <p className="mt-1 text-lg font-bold text-slate-950">Management</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <NavItems />
        </div>
        <div className="shrink-0 border-t border-slate-100 bg-white p-4">
          <button
            type="button"
            onClick={openProfile}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-100"
            aria-label="Open profile"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <UserRound size={17} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-800">
                {user?.name}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {user?.email}
              </span>
            </span>
          </button>
          <button
            onClick={logout}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Distribution
            </p>
            <p className="font-bold text-slate-950">Management</p>
          </div>
          <button
            onClick={() => setDrawer(true)}
            className="rounded-xl border border-slate-200 p-2.5"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {drawer && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden"
          onClick={() => setDrawer(false)}
        >
          <aside
            className="flex h-full w-[84%] max-w-sm flex-col overflow-hidden bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Menu
                </p>
                <p className="font-bold">Distribution Management</p>
              </div>
              <button
                className="rounded-xl p-2 hover:bg-slate-100"
                onClick={() => setDrawer(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <NavItems close={() => setDrawer(false)} />
            </div>
            <div className="shrink-0 border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={openProfile}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-100"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <UserRound size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {user?.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {user?.email}
                  </span>
                </span>
              </button>
              <button
                onClick={logout}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="px-4 pb-24 pt-5 sm:px-6 lg:ml-64 lg:px-8 lg:pb-8 lg:pt-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {mobileMain.map(([label, path, Icon]) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${isActive ? "text-slate-950" : "text-slate-400"}`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setDrawer(true)}
          className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-400"
        >
          <MoreHorizontal size={20} />
          More
        </button>
      </nav>
    </div>
  );
}
