import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
export default async function SPKDetail({params}:{params:{id:string}}){
 const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect("/login");
 const {data:r}=await s.from("spk_records").select("*").eq("id",params.id).single();if(!r)notFound();
 return <><Header/><main className="shell"><div className="toolbar"><div><h1>{r.customer_name}</h1><p className="muted">Detail SPK</p></div><Link className="btn primary" href={`/spk/${r.id}/edit`}>Edit SPK</Link></div><div className="card"><p><b>Tanggal:</b> {r.spk_date}</p><p><b>No. HP:</b> {r.phone}</p><p><b>Alamat:</b> {r.address||"-"}</p><p><b>Sumber:</b> {r.source||"-"}</p><p><b>Unit:</b> {r.unit_type}</p><p><b>DP / Cash:</b> {r.dp_cash||"-"}</p><p><b>Leasing:</b> {r.leasing||"-"}</p><p><b>Status:</b> {r.status}</p><p><b>Keterangan:</b> {r.notes||"-"}</p>{r.prospect_id&&<Link className="btn" href={`/prospects/${r.prospect_id}`}>Lihat Prospek Asal</Link>}</div></main></>;
}
