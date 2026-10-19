import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { OpsProvider } from "@/context/OpsContext";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import FrontDesk from "@/pages/FrontDesk";
import Bookings from "@/pages/Bookings";
import CheckIn from "@/pages/CheckIn";
import Manifest from "@/pages/Manifest";

function App() {
  return (
    <OpsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/front-desk" element={<FrontDesk />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/manifest" element={<Manifest />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-center" richColors />
    </OpsProvider>
  );
}

export default App;
