const fs=require('fs');const P=require((process.env.NHL9XSTUDIO||'../../../NHL9XStudio')+'/lib/pc95.js'),J=require((process.env.NHL9XSTUDIO||'../../../NHL9XStudio')+'/lib/pc-jersey.js');
const path=require('path');if(!(process.env.NHL95_DIR||process.argv[2])){console.error('Usage: node dump.js <NHL95 folder with *.PPV, HOMEPALS.BIN, AWAYPALS.BIN>  (set NHL9XSTUDIO to your NHL9XStudio checkout)');process.exit(1)}
const D=path.resolve(process.env.NHL95_DIR||process.argv[2])+path.sep,O=path.join(__dirname,'..','out','data')+path.sep;fs.mkdirSync(O,{recursive:true});
const files=fs.readdirSync(D).filter(f=>/^(\d{3}_\d{3}|\d{8})\.PPV$/.test(f)).map(f=>({name:f,data:new Uint8Array(fs.readFileSync(D+f))}));
const bank=P.buildSpriteBank(files,'players','95');
const hdr=[],bufs=[];let off=0;
for(const f of bank.frames){hdr.push([f.frame,f.width,f.height,off,-f.minX,-f.minY]);bufs.push(Buffer.from(f.pixels));off+=f.pixels.length;}
fs.writeFileSync(O+'frames.bin',Buffer.concat(bufs));fs.writeFileSync(O+'frames.json',JSON.stringify(hdr));
for(const side of ['HOME','AWAY']){const h=J.openFile(fs.readFileSync(D+side+'PALS.BIN'));const t=[];for(let i=0;i<28;i++)t.push({code:h.teams[i].code,colors:J.getColors(h,i),map:Array.from(J.getMap(h,i))});fs.writeFileSync(O+side+'.json',JSON.stringify(t));}
const o={};for(const z of J.ZONES)o[z.sprite]=z.name;fs.writeFileSync(O+'zn.json',JSON.stringify(o));
