import "server-only";
import {randomUUID} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {GetObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";

export const MAX_UPLOAD_BYTES=8*1024*1024;
export const IMAGE_MIME_TYPES=new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif"]);

function extension(mime:string){return ({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/heic":"heic","image/heif":"heif"} as Record<string,string>)[mime]??"bin"}
function provider(){return process.env.STORAGE_PROVIDER??"local"}
function s3(){return new S3Client({region:process.env.STORAGE_REGION??"auto",endpoint:process.env.STORAGE_ENDPOINT,forcePathStyle:process.env.STORAGE_FORCE_PATH_STYLE==="true",credentials:process.env.STORAGE_ACCESS_KEY_ID&&process.env.STORAGE_SECRET_ACCESS_KEY?{accessKeyId:process.env.STORAGE_ACCESS_KEY_ID,secretAccessKey:process.env.STORAGE_SECRET_ACCESS_KEY}:undefined})}

export async function storeImage(file:File,farmId:string){
  if(!IMAGE_MIME_TYPES.has(file.type))throw new Error("Unsupported image type. Use JPEG, PNG, WebP, HEIC, or HEIF.");
  if(file.size<=0||file.size>MAX_UPLOAD_BYTES)throw new Error("Images must be smaller than 8 MB.");
  const key=`farms/${farmId}/journal/${randomUUID()}.${extension(file.type)}`;const body=Buffer.from(await file.arrayBuffer());
  if(provider()==="s3"){
    const bucket=process.env.STORAGE_BUCKET;if(!bucket)throw new Error("Object storage is not configured.");
    await s3().send(new PutObjectCommand({Bucket:bucket,Key:key,Body:body,ContentType:file.type,ContentLength:file.size}));
  }else{
    if(process.env.NODE_ENV==="production")throw new Error("Production photo uploads require STORAGE_PROVIDER=s3.");
    const target=path.join(process.cwd(),"public","uploads",key);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,body);
  }
  return {storageKey:key,fileName:`field-photo.${extension(file.type)}`,mimeType:file.type,sizeBytes:file.size};
}

export async function readStoredImage(key:string){
  if(provider()==="s3"){
    const bucket=process.env.STORAGE_BUCKET;if(!bucket)throw new Error("Object storage is not configured.");
    const result=await s3().send(new GetObjectCommand({Bucket:bucket,Key:key}));if(!result.Body)throw new Error("Image not found.");return Buffer.from(await result.Body.transformToByteArray());
  }
  return readFile(path.join(process.cwd(),"public","uploads",key));
}

