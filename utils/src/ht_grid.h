#pragma once

#include <vector>

class ht_point{
public:
	float x,y;
	float z, zs;
	float er;
	bool bad;
	};

class ht_grid{
public:
	ht_grid() {nx=ny=nbad=0; p=0;} ;
	ht_grid(const char *filename);
	ht_grid(int nx, int ny, float *z, float *x=0, float *y=0);
	~ht_grid() {clear();};
	void clear();
	int fit();
	int fit3(int skip=0);
	int fix();
	void get_fixed(float *zf);

	int nx, ny;
	float x_dim, y_dim;
	ht_point *p;
	float a[6];
	double rms, peak;
	int nbad;
	bool fitted, fixed;
	};
