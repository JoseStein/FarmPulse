import {getActiveFarm,getCurrentUser} from "@/lib/data/queries";
import {SettingsView} from "@/components/settings-view";
import {redirect} from "next/navigation";
export const metadata={title:"Settings"};
export default async function SettingsPage(){const [farm,user]=await Promise.all([getActiveFarm(),getCurrentUser()]);if(user.role!=="ADMIN")redirect("/dashboard");return <SettingsView farm={farm}/>;}
