import {getActiveFarm,getCurrentUser,getFarmUsers} from "@/lib/data/queries";
import {SettingsView} from "@/components/settings-view";
import {redirect} from "next/navigation";
export const metadata={title:"Settings"};
export default async function SettingsPage(){const [farm,user]=await Promise.all([getActiveFarm(),getCurrentUser()]);if(user.role!=="ADMIN")redirect("/dashboard");const members=await getFarmUsers();return <SettingsView farm={farm} members={members} currentUserId={user.id}/>;}
