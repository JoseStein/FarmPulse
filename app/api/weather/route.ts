import {NextResponse} from "next/server";
import {getFarmWeather} from "@/lib/weather";
export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json(await getFarmWeather(),{headers:{"Cache-Control":"private, max-age=300, stale-while-revalidate=1500"}})}catch{return NextResponse.json({error:"Unable to load weather."},{status:401})}}
