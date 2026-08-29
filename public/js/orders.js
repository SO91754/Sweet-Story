(()=>{
const list=document.getElementById("ordersList"),status=document.getElementById("ordersStatus");
async function api(url,opts={}){const r=await fetch(url,opts);if(r.status===401){location.href="/login.html";throw new Error("Niet ingelogd")};const out=await r.json();if(!r.ok)throw new Error(out.error||"Fout");return out}
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const labels={pending:"In afwachting",confirmed:"Bevestigd",rejected:"Afgewezen",done:"Afgehaald"};
function fmtDate(d){try{return new Intl.DateTimeFormat("nl-BE",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date(d+"T00:00:00"))}catch{return d}}
async function load(){
 const orders=await api("/api/admin/orders");
 status.textContent=`${orders.length} aanvraag${orders.length===1?"":"en"}`;
 list.innerHTML=orders.map(o=>`<article class="order-card">
 <div class="order-head"><div><div class="kicker">${esc(o.orderType)}</div><h2 style="margin:4px 0">${esc(o.name)}</h2><small>${esc(o.id)}</small></div><span class="badge ${esc(o.status)}">${labels[o.status]||esc(o.status)}</span></div>
 <div class="order-meta"><div><small>Datum</small><b>${esc(fmtDate(o.date))}</b></div><div><small>Personen</small><b>${esc(o.people)}</b></div><div><small>Contact</small><b>${esc(o.phone||o.email)}</b></div></div>
 <div class="order-body"><div><b>Thema</b><p>${esc(o.theme)}</p><b>Smaak / vulling</b><p>${esc(o.flavour||"-")} / ${esc(o.filling||"-")}</p><b>Kleuren / tekst</b><p>${esc(o.colors||"-")} / ${esc(o.cakeText||"-")}</p></div><div><b>E-mail</b><p>${esc(o.email)}</p><b>Allergieën</b><p>${esc(o.allergies||"Geen opgegeven")}</p><b>Idee</b><p>${esc(o.message)}</p></div></div>
 <div class="actions">${o.hasReference?`<a class="btn secondary" href="/api/admin/orders/${encodeURIComponent(o.id)}/reference" target="_blank">Referentiefoto</a>`:""}<button class="btn primary" data-status="confirmed" data-id="${esc(o.id)}">Bevestigd</button><button class="btn secondary" data-status="rejected" data-id="${esc(o.id)}">Afwijzen</button><button class="btn secondary" data-status="done" data-id="${esc(o.id)}">Afgehaald</button></div>
 </article>`).join("");
 list.querySelectorAll("button[data-status]").forEach(b=>b.addEventListener("click",()=>setStatus(b.dataset.id,b.dataset.status)));
}
async function setStatus(id,newStatus){try{await api(`/api/admin/orders/${encodeURIComponent(id)}/status`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:newStatus})});await load()}catch(e){alert(e.message)}}
document.getElementById("logout").addEventListener("click",async()=>{await fetch("/api/logout",{method:"POST"});location.href="/login.html"});
load().catch(e=>status.textContent=e.message);
})();