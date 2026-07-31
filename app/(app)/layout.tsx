import { AppShell } from "@/components/app-shell";
import {getShellData} from "@/lib/data/queries";
export default async function ProtectedLayout({children}:{children:React.ReactNode}) { return <AppShell data={await getShellData()}>{children}</AppShell>; }
