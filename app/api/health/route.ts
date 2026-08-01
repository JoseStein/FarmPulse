import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({status:"ok",service:"farmpulse",database:"connected",time:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({status:"unavailable",service:"farmpulse",database:"disconnected",time:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
