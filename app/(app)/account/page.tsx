import { AccountView } from "@/components/account-view";
import { getCurrentUser } from "@/lib/data/queries";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  return <AccountView account={{ name: user.name, email: user.email, role: user.role }}/>;
}
