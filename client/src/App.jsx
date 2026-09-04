import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import { getToken } from "./lib/api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Bills from "./pages/Bills";
import Products from "./pages/Products";
import Retailers from "./pages/Retailers";
import SellingMaster from "./pages/SellingMaster";
import Purchases from "./pages/Purchases";
import Inventory from "./pages/Inventory";
import Collections from "./pages/Collections";
import Expenses from "./pages/Expenses";
import Profits from "./pages/Profits";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";

function Protected() {
  return getToken() ? <AppShell /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={getToken() ? <Navigate to="/" replace /> : <Login />}
      />
      <Route element={<Protected />}>
        <Route index element={<Dashboard />} />
        <Route path="billing" element={<Billing />} />
        <Route path="bills" element={<Bills />} />
        <Route path="products" element={<Products />} />
        <Route path="retailers" element={<Retailers />} />
        <Route path="selling-master" element={<SellingMaster />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="collections" element={<Collections />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="profits" element={<Profits />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
