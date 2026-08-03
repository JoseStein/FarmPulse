"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { createFarmUserAction, removeInactiveFarmUserAction, updateFarmUserAccessAction } from "@/app/actions";
import { Status } from "@/components/ui";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR";
  active: boolean;
  createdAt: string;
};

export function UserManagement({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function createUser(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await createFarmUserAction(Object.fromEntries(formData));
      if (!result.ok) return setMessage({ ok: false, text: result.error });
      formRef.current?.reset();
      setShowPassword(false);
      setMessage({ ok: true, text: "User created. They can now sign in with this email and password." });
      router.refresh();
    });
  }

  function updateAccess(member: Member, changes: Partial<Pick<Member, "role" | "active">>) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateFarmUserAccessAction({
        userId: member.id,
        role: changes.role ?? member.role,
        active: changes.active ?? member.active,
      });
      setMessage(result.ok
        ? { ok: true, text: "User access updated." }
        : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    });
  }

  function removeUser(member: Member) {
    if (!window.confirm(`Remove ${member.name} from this farm? Their historical work will be preserved.`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await removeInactiveFarmUserAction({ userId: member.id });
      setMessage(result.ok
        ? { ok: true, text: "Inactive user removed. Historical records were preserved." }
        : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    });
  }

  return <section className="card mt-4 p-5">
    <div className="flex items-start gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-farm-50 text-farm-700"><Users size={20}/></span>
      <div>
        <h2 className="font-bold">Users and access</h2>
        <p className="mt-1 text-sm text-slate-500">Create a private account for each person who works in FarmPulse.</p>
      </div>
    </div>

    <form ref={formRef} action={createUser} className="mt-5 rounded-2xl border bg-slate-50 p-4">
      <h3 className="font-semibold">Add a user</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Full name<input className="input mt-1" name="name" autoComplete="name" required/></label>
        <label className="text-sm font-semibold">Email address<input className="input mt-1" name="email" type="email" autoComplete="off" placeholder="person@example.com" required/></label>
        <label className="text-sm font-semibold">Role<select className="input mt-1" name="role" defaultValue="OPERATOR"><option value="OPERATOR">Operator</option><option value="ADMIN">Administrator</option></select></label>
        <label className="text-sm font-semibold">Temporary password<div className="relative mt-1"><input className="input pr-12" name="password" type={showPassword?"text":"password"} autoComplete="new-password" minLength={12} maxLength={128} required/><button type="button" onClick={()=>setShowPassword(value=>!value)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500" aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><span className="mt-1 block text-xs font-normal text-slate-500">At least 12 characters. Share it privately.</span></label>
      </div>
      <button className="btn-primary mt-4" disabled={pending}>{pending?<Loader2 className="animate-spin" size={17}/>:<UserPlus size={17}/>}Create user</button>
    </form>

    {message&&<p aria-live="polite" className={`mt-4 rounded-xl p-3 text-sm font-medium ${message.ok?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>{message.text}</p>}

    <div className="mt-5 divide-y rounded-2xl border">
      {members.map(member=><div key={member.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{member.name}</p>{member.id===currentUserId&&<Status tone="blue">You</Status>}<Status tone={member.active?"green":"slate"}>{member.active?"Active":"Inactive"}</Status></div>
          <p className="truncate text-sm text-slate-500">{member.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label={`Role for ${member.name}`} className="input h-11 w-auto py-1" value={member.role} disabled={pending||member.id===currentUserId} onChange={event=>updateAccess(member,{role:event.target.value as Member["role"]})}><option value="OPERATOR">Operator</option><option value="ADMIN">Administrator</option></select>
          {member.id!==currentUserId&&<button type="button" disabled={pending} onClick={()=>updateAccess(member,{active:!member.active})} className={member.active?"btn-secondary h-11":"btn-primary h-11"}>{member.active?"Deactivate":"Activate"}</button>}
          {!member.active&&member.id!==currentUserId&&<button type="button" disabled={pending} onClick={()=>removeUser(member)} className="flex h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={16}/>Remove</button>}
        </div>
      </div>)}
    </div>
  </section>;
}
