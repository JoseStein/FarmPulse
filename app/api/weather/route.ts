import {NextResponse} from "next/server";
import {getFarmWeather} from "@/lib/weather";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const forceRefresh=new URL(request.url).searchParams.get("refresh")==="1";return NextResponse.json(await getFarmWeather({forceRefresh}),{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({error:"Unable to load weather."},{status:401})}}
