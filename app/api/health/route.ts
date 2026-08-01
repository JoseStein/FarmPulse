import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    await prisma.$queryRaw`SELECT 1`;
    const activeAdministrators=await prisma.farmMembership.count({where:{role:"ADMIN",user:{active:true}}});
    return NextResponse.json({
      status:"ok",
      service:"farmpulse",
      database:"connected",
      setup:{
        authConfigured:Boolean(process.env.AUTH_SECRET),
        seedRequested:Boolean(process.env.SEED_ADMIN_PASSWORD),
        administratorReady:activeAdministrators>0,
      },
      time:new Date().toISOString(),
    },{headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({status:"unavailable",service:"farmpulse",database:"disconnected",time:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
