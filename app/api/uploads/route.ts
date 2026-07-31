import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requireActiveField} from "@/lib/data/context";
import {storeImage} from "@/lib/storage";
import {z} from "zod";

export async function POST(request:Request){
  try{
    const context=await requireActiveField();const form=await request.formData();const fieldNoteId=z.string().uuid().parse(form.get("fieldNoteId"));
    const note=await prisma.fieldNote.findFirst({where:{id:fieldNoteId,fieldId:context.field.id,deletedAt:null}});if(!note)return NextResponse.json({error:"Field note not found."},{status:404});
    const files=form.getAll("files").filter((value):value is File=>value instanceof File);if(!files.length||files.length>5)return NextResponse.json({error:"Choose between one and five images."},{status:400});
    const stored:Array<Awaited<ReturnType<typeof storeImage>>>=[];for(const file of files)stored.push(await storeImage(file,context.farm.id));
    const attachments=await prisma.$transaction(async tx=>{const rows=[];for(const item of stored)rows.push(await tx.attachment.create({data:{...item,fieldNoteId:note.id}}));await tx.auditLog.create({data:{farmId:context.farm.id,userId:context.user.id,action:"UPLOAD",entityType:"FieldNote",entityId:note.id,metadata:{count:rows.length}}});return rows;});
    return NextResponse.json({attachments:attachments.map(a=>({id:a.id,fileName:a.fileName,mimeType:a.mimeType,sizeBytes:a.sizeBytes}))});
  }catch(error){console.error("Photo upload failed",error);return NextResponse.json({error:error instanceof Error?error.message:"Upload failed."},{status:400})}
}
