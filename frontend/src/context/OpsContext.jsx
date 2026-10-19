import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";

const OpsContext = createContext(null);

export const OpsProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);
  const [slots, setSlots] = useState([]);
  const [tick, setTick] = useState(0);

  const refreshActivities = useCallback(async () => {
    const { data } = await api.get("/activities");
    setActivities(data);
  }, []);

  useEffect(() => {
    refreshActivities().catch(() => {});
    api.get("/meta").then(({ data }) => setSlots(data.slots)).catch(() => {});
    const t = setInterval(() => refreshActivities().catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [refreshActivities]);

  const run = async (path, msg) => {
    try {
      const { data } = await api.post(path);
      if (Array.isArray(data)) setActivities(data);
      else await refreshActivities();
      setTick((t) => t + 1);
      toast.success(msg || "Updated");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const value = {
    activities,
    slots,
    tick,
    bump: () => setTick((t) => t + 1),
    allPaused: activities.length > 0 && activities.every((a) => a.paused),
    pausedCount: activities.filter((a) => a.paused).length,
    pauseAll: () => run("/ops/pause-all", "Emergency pause activated"),
    resumeAll: () => run("/ops/resume-all", "All activities resumed"),
    toggle: (id) => run(`/activities/${id}/toggle`),
  };
  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
};

export const useOps = () => useContext(OpsContext);
