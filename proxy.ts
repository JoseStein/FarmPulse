import {getToken} from "next-auth/jwt";
import {NextResponse, type NextRequest} from "next/server";

export async function proxy(request: NextRequest) {
  const path=request.nextUrl.pathname;
  const isPublic=path.startsWith("/login")||path.startsWith("/api/auth")||path.startsWith("/api/health");
  if(isPublic)return NextResponse.next();
  const token=await getToken({req:request,secret:process.env.AUTH_SECRET,secureCookie:request.nextUrl.protocol==="https:"});
  if(token){const adminOnly=["/expenses","/inventory","/equipment","/crop-cycle","/reports","/settings"];if(token.role!=="ADMIN"&&adminOnly.some(route=>path===route||path.startsWith(`${route}/`)))return NextResponse.redirect(new URL("/dashboard",request.url));return NextResponse.next();}
  const login=new URL("/login",request.url);login.searchParams.set("callbackUrl",path);return NextResponse.redirect(login);
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg).*)"]};
