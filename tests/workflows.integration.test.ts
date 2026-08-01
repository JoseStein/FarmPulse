import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {randomUUID} from "node:crypto";
import bcrypt from "bcryptjs";

const authState=vi.hoisted(()=>({userId:""}));
vi.mock("server-only",()=>({}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/auth",()=>({auth:async()=>({user:{id:authState.userId}})}));

import {prisma} from "@/lib/prisma";
import {createActivityAction,createExpenseAction,createFieldNoteAction,adjustStockAction,updateIssueStatusAction,updateTaskStatusAction,createFarmUserAction,updateFarmUserAccessAction} from "@/app/actions";
import {getDashboardSummary,getExpenseData,getSectorSummaries} from "@/lib/data/queries";
import {getFarmWeather} from "@/lib/weather";
import {GET as exportReport} from "@/app/api/reports/[type]/route";

const created={activities:[] as string[],tasks:[] as string[],expenses:[] as string[],notes:[] as string[],issues:[] as string[],users:[] as string[],otherFarm:"",otherItem:""};
let adminId="",operatorId="",fieldId="",cycleId="",sectorId="";

beforeAll(async()=>{
 const [admin,operator]=await Promise.all([prisma.user.findUniqueOrThrow({where:{email:"admin@farmpulse.local"}}),prisma.user.findUniqueOrThrow({where:{email:"operator@farmpulse.local"}})]);adminId=admin.id;operatorId=operator.id;
 const membership=await prisma.farmMembership.findFirstOrThrow({where:{userId:operatorId},include:{farm:{include:{fields:{where:{status:"ACTIVE"},include:{sectors:true,cycles:{where:{status:"ACTIVE"}}}}}}}});const field=membership.farm.fields[0];fieldId=field.id;sectorId=field.sectors[0].id;cycleId=field.cycles[0].id;authState.userId=operatorId;
});

afterAll(async()=>{
 if(created.issues.length)await prisma.issue.deleteMany({where:{id:{in:created.issues}}});
 if(created.notes.length)await prisma.fieldNote.deleteMany({where:{id:{in:created.notes}}});
 await prisma.irrigationEvent.deleteMany({where:{activityId:{in:created.activities}}});
 if(created.activities.length)await prisma.activity.deleteMany({where:{id:{in:created.activities}}});
 if(created.tasks.length)await prisma.task.deleteMany({where:{id:{in:created.tasks}}});
 if(created.expenses.length)await prisma.expense.deleteMany({where:{id:{in:created.expenses}}});
 if(created.users.length)await prisma.user.deleteMany({where:{id:{in:created.users}}});
 if(created.otherItem)await prisma.inventoryItem.delete({where:{id:created.otherItem}}).catch(()=>undefined);
 if(created.otherFarm)await prisma.farm.delete({where:{id:created.otherFarm}}).catch(()=>undefined);
 await prisma.$disconnect();
});

describe.sequential("database-backed pilot workflows",()=>{
 let irrigationId="",irrigationEventId="",issueId="",expenseBefore=0;
 const irrigationKey=randomUUID();
 it("operator logs irrigation with the correct water estimate",async()=>{authState.userId=operatorId;const result=await createActivityAction({type:"IRRIGATION",sectorId,cropCycleId:cycleId,date:"2026-07-31",startTime:"18:10",durationMinutes:30,flowM3h:12,pressureBar:1.2,notes:"Integration irrigation",idempotencyKey:irrigationKey});expect(result.ok).toBe(true);if(!result.ok)return;irrigationId=result.data.id;irrigationEventId=result.data.irrigationEventId!;created.activities.push(irrigationId);expect(result.data.estimatedLiters).toBe(6000)});
 it("persists the linked activity and irrigation event",async()=>{const [activity,event]=await Promise.all([prisma.activity.findUnique({where:{id:irrigationId}}),prisma.irrigationEvent.findUnique({where:{id:irrigationEventId}})]);expect(activity?.type).toBe("IRRIGATION");expect(event?.activityId).toBe(irrigationId);expect(Number(event?.estimatedLiters)).toBe(6000)});
 it("updates dashboard and sector last-irrigation values",async()=>{authState.userId=operatorId;const [dashboard,sectors]=await Promise.all([getDashboardSummary(),getSectorSummaries()]);expect(dashboard.lastIrrigation?.id).toBe(irrigationEventId);expect(sectors.sectors.find(s=>s.id===sectorId)?.lastIrrigation?.estimatedLiters).toBe(6000)});
 it("prevents a duplicate irrigation submission",async()=>{const result=await createActivityAction({type:"IRRIGATION",sectorId,cropCycleId:cycleId,date:"2026-07-31",startTime:"18:10",durationMinutes:30,flowM3h:12,idempotencyKey:irrigationKey});expect(result.ok).toBe(false);expect(await prisma.activity.count({where:{idempotencyKey:irrigationKey}})).toBe(1)});
 it("completes a task and links an activity transactionally",async()=>{const task=await prisma.task.create({data:{fieldId,sectorId,cropCycleId:cycleId,assignedUserId:operatorId,name:"Integration irrigation task",category:"Irrigation",priority:"HIGH",dueAt:new Date("2026-07-31T20:00:00Z")}});created.tasks.push(task.id);const result=await updateTaskStatusAction({taskId:task.id,status:"COMPLETED",completionNotes:"Completed in integration test",createActivity:true});expect(result.ok).toBe(true);if(result.ok&&result.data.activityId)created.activities.push(result.data.activityId);const saved=await prisma.task.findUnique({where:{id:task.id},include:{relatedActivity:true}});expect(saved?.status).toBe("COMPLETED");expect(saved?.relatedActivity?.completedTaskId).toBe(task.id)});
 it("persists an administrator expense and recalculates totals",async()=>{authState.userId=adminId;expenseBefore=(await getExpenseData()).totals.actual;const result=await createExpenseAction({date:"2026-07-31",vendor:"Integration vendor",description:"Integration expense",category:"Testing",amount:12.34,sectorId,idempotencyKey:randomUUID()});expect(result.ok).toBe(true);if(!result.ok)return;created.expenses.push(result.data.id);const totals=await getExpenseData();expect(totals.totals.actual).toBeCloseTo(expenseBefore+12.34);expect(totals.rows.some(x=>x.id===result.data.id)).toBe(true)});
 it("blocks an operator from creating expenses",async()=>{authState.userId=operatorId;const result=await createExpenseAction({date:"2026-07-31",description:"Forbidden expense",category:"Testing",amount:5,idempotencyKey:randomUUID()});expect(result.ok).toBe(false);if(!result.ok)expect(result.error).toMatch(/permission/i)});
 it("lets an administrator create a private email login with a hashed password",async()=>{authState.userId=adminId;const email=`integration-${randomUUID()}@example.com`;const password="Integration-user-2026!";const result=await createFarmUserAction({name:"Integration User",email:`  ${email.toUpperCase()}  `,password,role:"OPERATOR"});expect(result.ok).toBe(true);if(!result.ok)return;created.users.push(result.data.id);const user=await prisma.user.findUniqueOrThrow({where:{id:result.data.id},include:{memberships:true}});expect(user.email).toBe(email);expect(user.passwordHash).not.toBe(password);expect(await bcrypt.compare(password,user.passwordHash)).toBe(true);expect(user.memberships).toContainEqual(expect.objectContaining({role:"OPERATOR"}))});
 it("lets an administrator deactivate a user account",async()=>{authState.userId=adminId;const userId=created.users[0];const result=await updateFarmUserAccessAction({userId,role:"OPERATOR",active:false});expect(result.ok).toBe(true);expect(await prisma.user.findUnique({where:{id:userId}})).toMatchObject({active:false})});
 it("blocks operators from creating user accounts",async()=>{authState.userId=operatorId;const result=await createFarmUserAction({name:"Forbidden User",email:`forbidden-${randomUUID()}@example.com`,password:"Integration-user-2026!",role:"OPERATOR"});expect(result.ok).toBe(false);if(!result.ok)expect(result.error).toMatch(/permission/i)});
 it("persists a field note and issue with follow-up task",async()=>{authState.userId=operatorId;const result=await createFieldNoteAction({sectorId,category:"Irrigation leak",body:"Integration issue note",isIssue:true,severity:"HIGH",issueTitle:"Integration leak",createFollowUpTask:true,idempotencyKey:randomUUID()});expect(result.ok).toBe(true);if(!result.ok)return;created.notes.push(result.data.id);issueId=result.data.issueId!;created.issues.push(issueId);if(result.data.taskId)created.tasks.push(result.data.taskId);expect(await prisma.issue.findUnique({where:{id:issueId}})).toMatchObject({status:"OPEN",fieldNoteId:result.data.id})});
 it("resolves the issue with the current user and timestamp",async()=>{authState.userId=operatorId;const result=await updateIssueStatusAction({issueId,status:"RESOLVED",resolutionNotes:"Leak repaired"});expect(result.ok).toBe(true);const issue=await prisma.issue.findUnique({where:{id:issueId}});expect(issue?.resolvedById).toBe(operatorId);expect(issue?.resolvedAt).toBeInstanceOf(Date)});
 it("prevents cross-farm inventory access",async()=>{const farm=await prisma.farm.create({data:{name:`Other farm ${randomUUID()}`,country:"Panama",timezone:"America/Panama",currency:"USD",unitSystem:"METRIC",latitude:8,longitude:-82}});created.otherFarm=farm.id;const item=await prisma.inventoryItem.create({data:{farmId:farm.id,name:"Other farm item",category:"Test",quantityOnHand:10,unit:"kg",minimumThreshold:1}});created.otherItem=item.id;authState.userId=operatorId;const result=await adjustStockAction({itemId:item.id,quantity:-1,reason:"Cross-farm attempt"});expect(result.ok).toBe(false)});
 it("exports actual expense rows to a safe CSV",async()=>{authState.userId=adminId;const response=await exportReport(new Request("http://localhost/api/reports/expenses"),{params:Promise.resolve({type:"expenses"})});const body=await response.text();expect(response.status).toBe(200);expect(body).toContain("Integration expense");expect(body).toContain("12.34")});
 it("uses saved weather when the live provider fails",async()=>{authState.userId=operatorId;const original=global.fetch;global.fetch=vi.fn().mockRejectedValue(new Error("offline"));try{const result=await getFarmWeather();expect(["database-cache","fallback"]).toContain(result.source);expect(result.stale).toBe(true)}finally{global.fetch=original}});
});
