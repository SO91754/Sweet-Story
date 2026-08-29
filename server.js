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
const DATA=path.join(ROOT,"data","works.json");
const UPLOADS=path.join(PUBLIC,"images","uploads");
fs.mkdirSync(UPLOADS,{recursive:true});

const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"ChangeMe-2026!";
if(!process.env.ADMIN_PASSWORD) console.warn("WAARSCHUWING: standaard adminwachtwoord actief. Zet ADMIN_PASSWORD in .env of terminal.");

app.use(express.json());
app.use(session({
 secret:process.env.SESSION_SECRET||crypto.randomBytes(32).toString("hex"),
 resave:false,saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:"lax",maxAge:1000*60*60*8}
}));
app.use(express.static(PUBLIC));

function readWorks(){return JSON.parse(fs.readFileSync(DATA,"utf8"))}
function writeWorks(x){fs.writeFileSync(DATA,JSON.stringify(x,null,2),"utf8")}
function auth(req,res,next){if(req.session&&req.session.admin)return next();res.status(401).json({error:"Niet ingelogd."})}
function safe(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9._-]+/g,"-").replace(/-+/g,"-")}
function localPath(url){if(!url||!url.startsWith("/images/uploads/"))return null;return path.join(UPLOADS,path.basename(url))}
const storage=multer.diskStorage({destination:(r,f,cb)=>cb(null,UPLOADS),filename:(r,f,cb)=>{const ext=path.extname(f.originalname).toLowerCase()||".jpg";cb(null,Date.now()+"-"+safe(path.basename(f.originalname,ext))+ext)}});
const upload=multer({storage,limits:{fileSize:12*1024*1024},fileFilter:(r,f,cb)=>f.mimetype.startsWith("image/")?cb(null,true):cb(new Error("Alleen afbeeldingen toegestaan."))});

app.get("/api/works",(req,res)=>res.json(readWorks()));
app.post("/api/login",(req,res)=>{if(req.body.password===ADMIN_PASSWORD){req.session.admin=true;return res.json({ok:true})}res.status(401).json({error:"Onjuist wachtwoord."})});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/works",auth,(req,res)=>res.json(readWorks()));

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