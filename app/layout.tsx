import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: { default:"FarmPulse", template:"%s · FarmPulse" }, description:"Practical field operations for farms and diverse crop cycles.", manifest:"/manifest.webmanifest", appleWebApp:{ capable:true, title:"FarmPulse", statusBarStyle:"default" } };
export const viewport: Viewport = { themeColor:"#285b3e", width:"device-width", initialScale:1, maximumScale:1 };
export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
