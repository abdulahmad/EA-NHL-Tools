// Tiny orthographic triangle rasteriser + wrong-pixel score for the NHL 96 low-poly fit.
#include <string.h>
#include <math.h>
#define MW 96
#define MH 96
static double zb[MW*MH]; static int fb[MW*MH];
double *zout=0;   // optional: per view MW*MH depths of the front face (set with set_zout)
void set_zout(double*p){zout=p;}
// cam: per view cos(th), sin(th), cos(phi), sin(phi), xo, yo.  lab: per view MW*MH shorts: -1 empty, -2 ignore, >=0 class.
// fid (optional): per view MW*MH ints, face id or -1.  facelab: best class per face (-1 if it owns nothing).  votes: nf*K ints scratch.
// returns miss+extra+wrong ; parts[0..2] = miss, extra, wrong
int score(const double*V,const int*F,int nf,int nviews,const double*cam,const int*W,const int*H,const short*lab,int K,int*facelab,int*votes,int*fid,int*parts){
  int miss=0,extra=0,wrong=0; memset(votes,0,sizeof(int)*nf*K);
  for(int d=0;d<nviews;d++){
    const double*c=cam+6*d; int w=W[d],h=H[d]; const short*L=lab+d*MW*MH;
    for(int i=0;i<w*h;i++){zb[i]=1e30;fb[i]=-1;}
    for(int f=0;f<nf;f++){
      double x[3],y[3],z[3];
      for(int k=0;k<3;k++){const double*p=V+3*F[3*f+k]; double sx=p[0]*c[0]+p[2]*c[1]; double ww=-p[0]*c[1]+p[2]*c[0];
        x[k]=sx+c[4]; y[k]=-(p[1]*c[2]+ww*c[3])+c[5]; z[k]=ww*c[2]-p[1]*c[3];}
      double area=(x[1]-x[0])*(y[2]-y[0])-(x[2]-x[0])*(y[1]-y[0]); if(fabs(area)<1e-9)continue;
      double mnx=fmin(x[0],fmin(x[1],x[2])),mxx=fmax(x[0],fmax(x[1],x[2])),mny=fmin(y[0],fmin(y[1],y[2])),mxy=fmax(y[0],fmax(y[1],y[2]));
      int x0=(int)floor(mnx-0.5),x1=(int)ceil(mxx-0.5),y0=(int)floor(mny-0.5),y1=(int)ceil(mxy-0.5);
      if(x0<0)x0=0; if(y0<0)y0=0; if(x1>=w)x1=w-1; if(y1>=h)y1=h-1;
      for(int py=y0;py<=y1;py++)for(int px=x0;px<=x1;px++){
        double cx=px+0.5,cy=py+0.5;
        double w0=((x[1]-cx)*(y[2]-cy)-(x[2]-cx)*(y[1]-cy))/area, w1=((x[2]-cx)*(y[0]-cy)-(x[0]-cx)*(y[2]-cy))/area, w2=1-w0-w1;
        if(w0<0||w1<0||w2<0)continue; double zz=w0*z[0]+w1*z[1]+w2*z[2]; int i=py*w+px; if(zz<zb[i]){zb[i]=zz;fb[i]=f;}
      }
    }
    for(int py=0;py<h;py++)for(int px=0;px<w;px++){int i=py*w+px; int l=L[py*MW+px]; int f=fb[i];
      if(fid)fid[d*MW*MH+py*MW+px]=f;
      if(zout)zout[d*MW*MH+py*MW+px]=zb[i];
      if(l==-2)continue; if(l==-1){if(f>=0)extra++;continue;} if(f<0){miss++;continue;} votes[f*K+l]++;}
  }
  for(int f=0;f<nf;f++){int tot=0,mx=0,arg=-1; for(int k=0;k<K;k++){int v=votes[f*K+k]; tot+=v; if(v>mx){mx=v;arg=k;}} wrong+=tot-mx; if(facelab)facelab[f]=arg;}
  if(parts){parts[0]=miss;parts[1]=extra;parts[2]=wrong;}
  return miss+extra+wrong;
}
