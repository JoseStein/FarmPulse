import {prisma} from "@/lib/prisma";
import {requireFarmContext} from "@/lib/data/context";
import {readStoredImage} from "@/lib/storage";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{const {id}=await params;const context=await requireFarmContext();const attachment=await prisma.attachment.findFirst({where:{id,OR:[{fieldNote:{field:{farmId:context.farm.id}}},{activity:{field:{farmId:context.farm.id}}},{expense:{field:{farmId:context.farm.id}}}]}});if(!attachment)return new Response("Not found",{status:404});const body=await readStoredImage(attachment.storageKey);return new Response(new Uint8Array(body),{headers:{"Content-Type":attachment.mimeType,"Content-Length":String(body.length),"Cache-Control":"private, max-age=3600","X-Content-Type-Options":"nosniff"}})}catch{return new Response("Not found",{status:404})}
}
