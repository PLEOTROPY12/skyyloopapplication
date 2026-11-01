import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sid = new URLSearchParams(location.hash.slice(1)).get("session_id");
    api
      .post("/auth/session", { session_id: sid })
      .then(({ data }) => {
        setUser(data);
        navigate("/", { replace: true });
      })
      .catch(() => navigate("/login", { replace: true }));
  }, [location.hash, navigate, setUser]);

  return null;
}
