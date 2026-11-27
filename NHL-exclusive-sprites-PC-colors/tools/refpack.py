"""EA RefPack (QFS) decompression, checked byte-exact on NHL 95 PC RINKPAL.QFS, RINKPAL2.QFS, PALETTE.QFS and RINK.QFS (header 10 FB / 11 FB + 3-byte big-endian size)."""
def unpack(src):
  src=bytes(src);flags=src[0];assert src[1]==0xFB,'not RefPack'
  i=2+(3 if flags&1 else 0);size=int.from_bytes(src[i:i+3],'big');i+=3
  out=bytearray()
  while i<len(src):
    b0=src[i]
    if b0<0x80:
      b1=src[i+1];i+=2;pl=b0&3;cl=((b0&0x1c)>>2)+3;off=((b0&0x60)<<3)+b1+1
    elif b0<0xC0:
      b1,b2=src[i+1],src[i+2];i+=3;pl=b1>>6;cl=(b0&0x3f)+4;off=((b1&0x3f)<<8)+b2+1
    elif b0<0xE0:
      b1,b2,b3=src[i+1],src[i+2],src[i+3];i+=4;pl=b0&3;cl=((b0&0x0c)<<6)+b3+5;off=((b0&0x10)<<12)+(b1<<8)+b2+1
    elif b0<0xFC:
      i+=1;pl=((b0&0x1f)<<2)+4;out+=src[i:i+pl];i+=pl;continue
    else:
      i+=1;pl=b0&3;out+=src[i:i+pl];break
    out+=src[i:i+pl];i+=pl
    for _ in range(cl):out.append(out[-off])
  assert len(out)==size,(len(out),size)
  return bytes(out)
