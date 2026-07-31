import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name:"FarmPulse", short_name:"FarmPulse", description:"Farm operations for the Panama corn pilot", start_url:"/dashboard", display:"standalone", background_color:"#f5f7f4", theme_color:"#285b3e", icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml"}] }; }
