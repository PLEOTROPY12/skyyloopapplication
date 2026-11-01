import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { PageHeader, Card, Btn, selectCls } from "@/components/common";

const FIELDS = [["business_name", "Business name"], ["phone", "Contact phone"], ["gst_number", "GST number"], ["address", "Tower address"]];

export default function Profile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState(Object.fromEntries(FIELDS.map(([k]) => [k, user?.[k] || ""])));
  const save = async () => {
    try {
      const { data } = await api.put("/profile", f);
      setUser(data);
      toast.success("Profile saved");
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <>
      <PageHeader title="Profile" sub="Account and preferences" />
      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <Card className="p-6 text-center">
          {user?.picture && <img src={user.picture} alt="" className="h-20 w-20 rounded-2xl mx-auto object-cover" />}
          <p className="font-heading text-xl font-bold text-navy mt-4" data-testid="profile-name">{user?.name}</p>
          <p className="text-sm text-slate-500" data-testid="profile-email">{user?.email}</p>
          <span className="inline-block mt-3 px-3 py-1 rounded-md bg-brand-light text-brand-dark text-xs font-bold uppercase tracking-wider">{user?.role}</span>
        </Card>
        <Card className="p-6 space-y-4">
          {FIELDS.map(([k, l]) => (
            <label key={k} className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{l}</span>
              <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={`${selectCls} w-full mt-1.5`} data-testid={`profile-${k}-input`} />
            </label>
          ))}
          <Btn onClick={save} data-testid="profile-save-btn">Save changes</Btn>
        </Card>
      </div>
    </>
  );
}
