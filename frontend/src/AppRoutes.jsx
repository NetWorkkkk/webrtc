import { Navigate, Route, Routes } from "react-router-dom";
import { AuthPage } from "./pages/AuthPage";
import { RoomPage } from "./pages/RoomPage";
import { CallPage } from "./pages/CallPage";
import { CallNotification } from "./components/CallNotification";

export function AppRoutes() {
  return (
    <>
      <CallNotification />
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/room" element={<RoomPage />} />
        <Route path="/call" element={<CallPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
