"""NHL 95 PC player sprite banks (NNN_NNN.PPV / NNNNNNNN.PPV): SHPI directory + SPIT RLE pictures.
Pixel values are 95 PC palette indices (255 = transparent, 144-191 team zones, 192-255 crest, 0 black...).
Format (all little-endian), per NHL9XStudio lib/pc95.js:
  'SHPI' u32 file_size u32 count 'SPIT'
  count x ( 4-byte ASCII tag e.g. '0633', u32 offset of picture )
  picture: u8 type, 3 bytes (kept verbatim), s16 width, s16 height, s16 xOffset, s16 yOffset, s16 xPos, s16 yPos,
           then RLE: d==0 end; d>=128 -> (256-d) literal bytes follow; 1..127 -> next byte repeated d times.
           type 123 = raw width*height bytes."""
import struct
def parse(b):
    assert b[:4]==b'SHPI'
    size,count=struct.unpack('<II',b[4:12]);ident=b[12:16]
    ents=[(b[16+i*8:20+i*8],struct.unpack('<I',b[20+i*8:24+i*8])[0]) for i in range(count)]
    pics=[]
    for k,(tag,off) in enumerate(ents):
        end=ents[k+1][1] if k+1<count else len(b)
        pics.append(dict(tag=tag.decode('ascii','replace'),raw=b[off:end],**decode_pic(b[off:end])))
    return dict(size=size,count=count,ident=ident,pics=pics)
def decode_pic(p):
    t=p[0];w,h,xo,yo,xp,yp=struct.unpack('<hhhhhh',p[4:16]);n=w*h;px=bytearray();i=16
    if t==123: px=bytearray(p[16:16+n]);i=16+n
    else:
        while len(px)<n:
            d=p[i];i+=1
            if d==0:break
            if d>=128:L=256-d;px+=p[i:i+L];i+=L
            else:px+=bytes([p[i]])*d;i+=1
    used=i
    return dict(type=t,hdr=p[:16],w=w,h=h,xoff=xo,yoff=yo,xpos=xp,ypos=yp,pixels=bytes(px[:n]),used=used,trail=p[used:])
def rle(px,minrun=3,maxrun=127,maxlit=128):
    """EA's rule, verified byte-identical on all 1,135 retail 95 PC player pictures:
    transparent (255) is always a run (even length 1); other colours are a run when 3+ repeat,
    otherwise they go into literals; runs cap at 127, literals at 128; picture ends with 0."""
    out=bytearray();i=0;n=len(px);lit=bytearray()
    def flush():
        nonlocal lit
        while lit:
            c=lit[:maxlit];out.append(256-len(c));out.extend(c);lit=lit[len(c):]
    while i<n:
        j=i
        while j<n and px[j]==px[i] and j-i<maxrun:j+=1
        r=j-i
        if px[i]==255 or r>=minrun:flush();out+=bytes([r,px[i]])
        else:lit+=px[i:j]
        i=j
    flush();out.append(0);return bytes(out)
def encode_pic(hdr,w,h,pixels):
    """hdr: the 16-byte SPIT header to keep (type byte, 3 unknown bytes, offsets/positions); w/h are rewritten."""
    assert len(pixels)==w*h
    hdr=bytearray(hdr[:16]);hdr[4:8]=struct.pack('<hh',w,h)
    if hdr[0]==123:return bytes(hdr)+bytes(pixels)
    return bytes(hdr)+rle(pixels)
def build(ident,pics):
    count=len(pics);off=16+count*8;dir_=bytearray();body=bytearray()
    for p in pics:
        dir_+=p['tag'].encode('ascii')[:4].ljust(4,b'\0')+struct.pack('<I',off+len(body));body+=p['bytes']
    total=16+len(dir_)+len(body)
    return b'SHPI'+struct.pack('<II',total,count)+ident+bytes(dir_)+bytes(body)
