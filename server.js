const express=require("express");
const multer=require("multer");
const session=require("express-session");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

const app=express();
const PORT=process.env.PORT||3000;
const ROOT=__dirname;
const PUBLIC=path.join(ROOT,"public");
const DATA_DIR=path.join(ROOT,"data");
const WORKS_DATA=path.join(DATA_DIR,"works.json");
const ORDERS_DATA=path.join(DATA_DIR,"orders.json");
const UPLOADS=path.join(PUBLIC,"images","uploads");
const ORDER_UPLOADS=path.join(DATA_DIR,"order_uploads");
fs.mkdirSync(UPLOADS,{recursive:true});
fs.mkdirSync(ORDER_UPLOADS,{recursive:true});
fs.mkdirSync(DATA_DIR,{recursive:true});
if(!fs.existsSync(ORDERS_DATA)) fs.writeFileSync(ORDERS_DATA,"[]\n","utf8");

const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"ChangeMe-2026!";
if(!process.env.ADMIN_PASSWORD) console.warn("WAARSCHUWING: standaard adminwachtwoord actief. Zet ADMIN_PASSWORD in .env of terminal.");

app.use(express.json());
app.use(session({
 secret:process.env.SESSION_SECRET||crypto.randomBytes(32).toString("hex"),
 resave:false,saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:"lax",maxAge:1000*60*60*8}
}));
app.use(express.static(PUBLIC));

function readJson(file,fallback=[]){try{return JSON.parse(fs.readFileSync(file,"utf8"))}catch{return fallback}}
function writeJson(file,data){fs.writeFileSync(file,JSON.stringify(data,null,2),"utf8")}
function readWorks(){return readJson(WORKS_DATA,[])}
function writeWorks(x){writeJson(WORKS_DATA,x)}
function readOrders(){return readJson(ORDERS_DATA,[])}
function writeOrders(x){writeJson(ORDERS_DATA,x)}
function auth(req,res,next){if(req.session&&req.session.admin)return next();res.status(401).json({error:"Niet ingelogd."})}
function safe(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9._-]+/g,"-").replace(/-+/g,"-")}
function localPath(url){if(!url||!url.startsWith("/images/uploads/"))return null;return path.join(UPLOADS,path.basename(url))}

const storage=multer.diskStorage({destination:(r,f,cb)=>cb(null,UPLOADS),filename:(r,f,cb)=>{const ext=path.extname(f.originalname).toLowerCase()||".jpg";cb(null,Date.now()+"-"+safe(path.basename(f.originalname,ext))+ext)}});
const upload=multer({storage,limits:{fileSize:12*1024*1024},fileFilter:(r,f,cb)=>f.mimetype.startsWith("image/")?cb(null,true):cb(new Error("Alleen afbeeldingen toegestaan."))});

const orderStorage=multer.diskStorage({
 destination:(r,f,cb)=>cb(null,ORDER_UPLOADS),
 filename:(r,f,cb)=>{const ext=path.extname(f.originalname).toLowerCase()||".jpg";cb(null,crypto.randomUUID()+ext)}
});
const orderUpload=multer({storage:orderStorage,limits:{fileSize:10*1024*1024},fileFilter:(r,f,cb)=>f.mimetype.startsWith("image/")?cb(null,true):cb(new Error("Alleen afbeeldingen toegestaan."))});

app.get("/api/works",(req,res)=>res.json(readWorks()));

app.post("/api/orders",orderUpload.single("reference"),(req,res)=>{
 try{
  const b=req.body;
  for(const key of ["name","email","date","orderType","people","theme","message"]){
   if(!String(b[key]||"").trim()) return res.status(400).json({error:"Vul alle verplichte velden in."});
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email))) return res.status(400).json({error:"Ongeldig e-mailadres."});
  const order={
   id:"SS-"+Date.now().toString(36).toUpperCase(),
   createdAt:new Date().toISOString(),
   status:"pending",
   name:String(b.name).trim(),
   email:String(b.email).trim(),
   phone:String(b.phone||"").trim(),
   date:String(b.date).trim(),
   orderType:String(b.orderType).trim(),
   people:String(b.people).trim(),
   flavour:String(b.flavour||"").trim(),
   filling:String(b.filling||"").trim(),
   theme:String(b.theme).trim(),
   colors:String(b.colors||"").trim(),
   cakeText:String(b.cakeText||"").trim(),
   allergies:String(b.allergies||"").trim(),
   message:String(b.message).trim(),
   referenceFile:req.file?req.file.filename:"",
   referenceOriginal:req.file?req.file.originalname:""
  };
  const orders=readOrders();
  orders.unshift(order);
  writeOrders(orders);
  res.json({ok:true,orderId:order.id});
 }catch(e){
  console.error(e);
  res.status(500).json({error:"Aanvraag kon niet worden opgeslagen."});
 }
});

app.post("/api/login",(req,res)=>{if(req.body.password===ADMIN_PASSWORD){req.session.admin=true;return res.json({ok:true})}res.status(401).json({error:"Onjuist wachtwoord."})});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/works",auth,(req,res)=>res.json(readWorks()));
app.get("/api/admin/orders",auth,(req,res)=>res.json(readOrders().map(o=>({...o,hasReference:!!o.referenceFile,referenceFile:undefined}))));
app.get("/api/admin/orders/:id/reference",auth,(req,res)=>{
 const order=readOrders().find(o=>o.id===req.params.id);
 if(!order||!order.referenceFile) return res.status(404).send("Niet gevonden.");
 const file=path.join(ORDER_UPLOADS,path.basename(order.referenceFile));
 if(!fs.existsSync(file)) return res.status(404).send("Niet gevonden.");
 res.sendFile(file);
});
app.post("/api/admin/orders/:id/status",auth,(req,res)=>{
 const allowed=["pending","confirmed","rejected","done"];
 if(!allowed.includes(req.body.status)) return res.status(400).json({error:"Ongeldige status."});
 const orders=readOrders();
 const i=orders.findIndex(o=>o.id===req.params.id);
 if(i<0) return res.status(404).json({error:"Aanvraag niet gevonden."});
 orders[i].status=req.body.status;
 orders[i].updatedAt=new Date().toISOString();
 writeOrders(orders);
 res.json({ok:true,order:orders[i]});
});
app.delete("/api/admin/orders/:id",auth,(req,res)=>{
 try{
  const orders=readOrders();
  const i=orders.findIndex(o=>o.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Aanvraag niet gevonden."});
  const [order]=orders.splice(i,1);
  if(order.referenceFile){
   const file=path.join(ORDER_UPLOADS,path.basename(order.referenceFile));
   if(fs.existsSync(file)) try{fs.unlinkSync(file)}catch{}
  }
  writeOrders(orders);
  res.json({ok:true});
 }catch(e){
  console.error(e);
  res.status(500).json({error:"Aanvraag kon niet worden verwijderd."});
 }
});

app.post("/api/admin/works",auth,upload.single("photo"),(req,res)=>{
 try{
  const x=JSON.parse(req.body.work||"{}");if(!x.title)return res.status(400).json({error:"Titel is verplicht."});
  const works=readWorks();x.id="work-"+Date.now();x.image=req.file?"/images/uploads/"+req.file.filename:"";x.featured=false;works.unshift(x);writeWorks(works);res.json({ok:true,work:x});
 }catch(e){res.status(500).json({error:"Opslaan mislukt."})}
});

app.put("/api/admin/works/:id",auth,upload.single("photo"),(req,res)=>{
 try{
  const works=readWorks(),i=works.findIndex(x=>x.id===req.params.id);if(i<0)return res.status(404).json({error:"Niet gevonden."});
  const old=works[i],x=JSON.parse(req.body.work||"{}");x.id=old.id;x.featured=old.featured||false;
  if(req.file){const p=localPath(old.image);if(p&&fs.existsSync(p))try{fs.unlinkSync(p)}catch{};x.image="/images/uploads/"+req.file.filename}else x.image=old.image;
  works[i]=x;writeWorks(works);res.json({ok:true,work:x});
 }catch(e){res.status(500).json({error:"Bijwerken mislukt."})}
});

app.delete("/api/admin/works/:id",auth,(req,res)=>{
 try{
  const works=readWorks(),i=works.findIndex(x=>x.id===req.params.id);if(i<0)return res.status(404).json({error:"Niet gevonden."});
  const [x]=works.splice(i,1);const p=localPath(x.image);if(p&&fs.existsSync(p))try{fs.unlinkSync(p)}catch{};writeWorks(works);res.json({ok:true});
 }catch(e){res.status(500).json({error:"Verwijderen mislukt."})}
});

app.listen(PORT,"0.0.0.0",()=>console.log(`Sweet Story draait op http://localhost:${PORT}`));