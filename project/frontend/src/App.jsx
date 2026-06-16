import { Routes, Route, Navigate } from "react-router-dom";
import { SoftAurora } from "./components/animated";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ScanPage from "./pages/ScanPage";
import ResultsPage from "./pages/ResultsPage";
import SwapPage from "./pages/SwapPage";
import CatalogPage from "./pages/CatalogPage";
import PricingPage from "./pages/PricingPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import SalonsPage from "./pages/SalonsPage";

// Luong chinh: / -> /scan -> /results -> /swap
export default function App() {
  return (
    <div className="relative">
      {/* Background mo mang cho moi route - fixed, GPU compositor xu ly */}
      <SoftAurora intensity={1.05} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/swap" element={<SwapPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/salons" element={<SalonsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
