#include <stdlib.h>
#include "frame.h"
#include "ht_grid.h"

ht_grid::ht_grid(int _nx, int _ny, float *z, float *x, float *y)
	{
	int i,j,n;

	p = 0;
	clear();
	nx=_nx; ny=_ny;

	p=(ht_point *)calloc(nx*ny, sizeof(ht_point));

	for(j=n=0; j<ny; j++){
		for(i=0; i<nx; i++, n++){
			p[n].x=x?x[n]:i;
			p[n].y=y?y[n]:j;
			p[n].z=z[n];
			}
		}
	}

void
ht_grid::clear()
	{
	nx=ny=nbad=0;
	fitted=fixed=false;
	if(p)
		free(p);
	}

#include "armadillo"

using namespace arma;
using namespace std;
#define order 7

// find the least squares quadratic surface approximation
int
ht_grid::fit()
	{
	int i;
	int n=nx*ny;
	float x,y;
	float t;
	// Build matrices to solve Ax = b problem:
	vec b(n);
	mat C(n, 6);

	for(i=0; i<n; ++i){
		b(i)   = p[i].z;

		x=p[i].x; y=p[i].y;
//		db_printf("%d %f %f %f",i,x,y,b(i));
		C(i,0) = 1;
		C(i,1) = x;
		C(i,2) = y;
		C(i,3) = x*x;
		C(i,4) = y*y;
		C(i,5) = x*y;
		}

	// Compute least-squares solution:
	vec solution = solve(C,b);

	// save the coefficients
	for(i=0; i<6; i++)
		a[i]=solution(i);

	db_printf("surface coefficients: %f %f %f %f %f %f",
		a[0],a[1],a[2],a[3],a[4],a[5]);

	// compute the smoothed z values
	for(i=0; i<n; ++i){
		t=0;

		x=p[i].x; y=p[i].y;
		t += a[0]*1;
		t += a[1]*x;
		t += a[2]*y;
		t += a[3]*x*x;
		t += a[4]*y*y;
		t += a[5]*x*y;
		p[i].zs=t;
		}

	// build the error surface and compute peak and rms error
	rms=peak=0.0;
	for(i=0; i<nx*ny; i++){
		p[i].er=p[i].z-p[i].zs;
		rms += p[i].er * p[i].er;
		if(fabs(p[i].er) > peak)
			peak=fabs(p[i].er);
		}
	rms /= nx*ny;
	rms = sqrt(rms);
	db_printf("rms=%f peak=%f", rms, peak);
	fitted=true;

	return(0);
	}

// find a "mostly quadratic" surface,
// with a single third order term in y
int
ht_grid::fit3(int skip)
	{
	int i,j;
	int n=nx*ny;
	int m;
	float x,y,z;
	float t;

	db_printf("fit3: skip=%d",skip);
	// Build matrices to solve Ax = b problem:
	m=n-skip;

	vec b(m);
	mat C(m, 7);

  for(i=j=0; i<n; i++){
	if(p[i].bad)
		continue;

	x=p[i].x; y=p[i].y; z=p[i].z;

    b(j)   = z;

    C(j,0) = 1;
    C(j,1) = x;
    C(j,2) = y;
    C(j,3) = x*x;
    C(j,4) = y*y;
    C(j,5) = x*y;
    C(j,6) = y*y*y;
    j++;
    }

    // Compute least-squares solution:
	vec solution = solve(C,b);

	// save the coefficients
	for(i=0; i<7; i++)
		a[i]=solution(i);
	db_printf("surface coefficients: %f %f %f %f %f %f %f",
		a[0],a[1],a[2],a[3],a[4],a[5],a[6]);

	// compute the smoothed z values
	for(i=0; i<n; ++i){
		t=0;

		x=p[i].x; y=p[i].y;
		t += a[0]*1;
		t += a[1]*x;
		t += a[2]*y;
		t += a[3]*x*x;
		t += a[4]*y*y;
		t += a[5]*x*y;
		t += a[6]*y*y*y;
		p[i].zs=t;
		}

	// build the error surface and compute peak and rms error
	rms=peak=0.0;
	for(i=0; i<nx*ny; i++){
		p[i].er=p[i].z-p[i].zs;
		rms += p[i].er * p[i].er;
		if(fabs(p[i].er) > peak)
			peak=fabs(p[i].er);
		}
	rms /= nx*ny;
	rms = sqrt(rms);
	db_printf("rms=%f peak=%f", rms, peak);
	fitted=true;

	return(0);
	}

int
ht_grid::fix()
	{
	int n=nx*ny;
	int i;
	double lim=3.0*rms;

	if(!fitted)
		fit3();

	if(peak < lim)
		return(0);

	nbad=0;
	for(i=0; i<n; i++){
		if(fabs(p[i].er)>=lim){
			p[i].bad=true;
			nbad++;
			}
		else
			p[i].bad=false;
		}

	// refit
	fit3(nbad);

	for(i=0; i<n; i++)
		if(p[i].bad)
			db_printf("replace %d (%f,%f) %f with %f",i,p[i].x,p[i].y,p[i].z,p[i].zs);


	return(nbad);
	}

void
ht_grid::get_fixed(float *zf)
	{
	int i;
	int n=nx*ny;

	for(i=0; i<n; i++){
		if(p[i].bad)
			zf[i]=p[i].zs;
		else
			zf[i]=p[i].z;
		}
	}
