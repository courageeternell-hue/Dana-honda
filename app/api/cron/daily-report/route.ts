import {NextRequest,NextResponse} from "next/server";import {createClient as createSupabase} from "@supabase/supabase-js";import * as XLSX from "xlsx";
export const runtime="nodejs";
export async function GET(req:NextRequest){if(req.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});
const supabase=createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const {data:prospects,error:pe}=await supabase.from("prospects").select("*").eq("prospect_date",day);
const {data:spk,error:se}=await supabase.from("spk_records").select("*").eq("spk_date",day);
if(pe||se)return NextResponse.json({error:pe?.message||se?.message},{status:500});
const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((prospects||[]).map((r:any,i:number)=>({"No":i+1,"Tanggal":r.prospect_date,"Nama Konsumen":r.customer_name,"No HP":r.phone,"Sumber":r.source,"Follow Up":r.follow_up,"Respon":r.lead_response,"Deal":r.deal_status,"SPK":r.spk_created?"Ya":"Tidak","Keterangan":r.notes,"Sales ID":r.user_id}))),"Prospek");
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((spk||[]).map((r:any)=>({"Tanggal":r.spk_date,"Nama Sales":r.sales_name,"Nama Konsumen":r.customer_name,"No HP":r.phone,"Alamat":r.address,"Sumber":r.source,"Type Unit":r.unit_type,"DP / Harga Cash":r.dp_cash,"Leasing":r.leasing,"Keterangan":r.notes,"Status SPK":r.status}))),"SPK");
const file=XLSX.write(wb,{type:"buffer",bookType:"xlsx"});const path=`daily/${day}/Honda-Sales-Report-${day}.xlsx`;
const {error:uploadError}=await supabase.storage.from("daily-reports").upload(path,file,{contentType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",upsert:true});
if(uploadError)return NextResponse.json({error:uploadError.message},{status:500});
await supabase.from("daily_reports").upsert({report_date:day,storage_path:path,created_at:new Date().toISOString()},{onConflict:"report_date"});
return NextResponse.json({ok:true,date:day,prospects:prospects?.length||0,spk:spk?.length||0,path});}
