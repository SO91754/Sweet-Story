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
document.getElementById("orderForm").addEventListener("submit",e=>{
 e.preventDefault();
 const f=new FormData(e.currentTarget);
 const text=`Hallo Sweet Story,%0A%0AIk wil graag een bestelling aanvragen.%0ANaam: ${encodeURIComponent(f.get("name")||"")}%0ADatum: ${encodeURIComponent(f.get("date")||"")}%0AAantal personen: ${encodeURIComponent(f.get("people")||"")}%0AThema: ${encodeURIComponent(f.get("theme")||"")}%0A%0A${encodeURIComponent(f.get("message")||"")}`;
 window.open(`https://www.instagram.com/sweet_story_lanaken/`,"_blank");
});
load();