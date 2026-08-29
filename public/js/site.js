let works=[],active="Alles";
const gallery=document.getElementById("gallery"),filters=document.getElementById("filters"),empty=document.getElementById("empty");
async function load(){
 const r=await fetch("/api/works");works=await r.json();
 const cats=["Alles",...new Set(works.map(x=>x.category))];
 filters.innerHTML=cats.map(c=>`<button class="filter ${c==="Alles"?"active":""}" data-cat="${c}">${c}</button>`).join("");
 filters.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{filters.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");active=b.dataset.cat;render()}));
 render();
}
function render(){
 const list=active==="Alles"?works:works.filter(x=>x.category===active);
 gallery.innerHTML=list.map(x=>`<article class="work-card"><img src="${x.image}" alt="${x.title}"><div class="work-body"><small>${x.category}</small><h3>${x.title}</h3><p>${x.description||""}</p></div></article>`).join("");
 empty.style.display=list.length?"none":"block";
}

document.getElementById("orderForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const form=e.currentTarget;
 const button=document.getElementById("orderSubmit");
 const status=document.getElementById("orderStatus");
 status.style.display="block";
 status.textContent="Aanvraag wordt verstuurd...";
 button.disabled=true;
 try{
  const r=await fetch("/api/orders",{method:"POST",body:new FormData(form)});
  const out=await r.json();
  if(!r.ok) throw new Error(out.error||"Verzenden mislukt.");
  status.innerHTML=`✅ <strong>Aanvraag ontvangen.</strong><br>Referentie: ${out.orderId}<br>Sweet Story controleert eerst de datum en details.`;
  form.reset();
 }catch(err){
  status.textContent="❌ "+err.message;
 }finally{
  button.disabled=false;
 }
});
load();