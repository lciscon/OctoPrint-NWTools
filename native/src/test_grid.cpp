#include <sys/types.h>
#include <sys/stat.h>
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>

#include "frame.h"
#include "ht_grid.h"

ht_grid *g;

int
load(const char *filename)
	{
	return(0);
	}

int
read_grid_ascii(const char *filename)
	{
	FILE *ifp;
	int i,j,n;
	float v[7];
	float x[49], y[49], z[49];
	int nx, ny;
	int nbad;


	if((ifp=fopen(filename,"r"))==NULL)
		errxit("read_grid_ascii: can't open %s\n",filename);

	nx=ny=7;

	for(j=n=0; j<ny; j++){
		if(fscanf(ifp, "%f %f %f %f %f %f %f", &v[0], &v[1], &v[2], &v[3], &v[4], &v[5], &v[6])!=7)
			goto bad_line;
		for(i=0; i<nx; i++, n++){
			x[n]=i-3; y[n]=j-3; z[n]=v[i];
			}
		}

	fclose(ifp);

	if(g)
		delete g;
	g=new ht_grid(nx, ny, z, x, y);

//	g->fit();
	g->fit3();
	nbad=g->fix();

	db_printf("fix returned %d",nbad);

	return(nbad);


bad_line:
	fclose(ifp);
	errxit("read_grid_ascii: bad line %d\n", j+1);
	return(-1);
	}

int
read_grid(const char *filename)
	{
	FILE *ifp;
	struct stat sbuf;

	int i,j,n;
	float *x, *y, *z;
	uint8_t nb;
	float fx, fy, fz;
	int nx, ny;

	if(stat(filename, &sbuf))
		errxit("read_grid: can't stat %s\n",filename);
	db_printf("file size=%d", sbuf.st_size);

	if((ifp=fopen(filename,"r"))==NULL)
		errxit("read_grid: can't open %s\n",filename);

	if(fread(&nb, sizeof(uint8_t), 1, ifp) != 1)
        errxit("error:Failed to read grid size\n");

	db_printf("grid size=%d", nb);

	if(fread(&fx, sizeof(float), 1, ifp) != 1
	|| fread(&fy, sizeof(float), 1, ifp) != 1)
        errxit("error:Failed to read grid size\n");
	db_printf("grid size = %f,%f",fx,fy);


	nx=ny=nb;
	x=(float *)calloc(nb*nb, sizeof(float));
	y=(float *)calloc(nb*nb, sizeof(float));
	z=(float *)calloc(nb*nb, sizeof(float));

	for(j=n=0; j<ny; j++){
		for(i=0; i<nx; i++, n++){
			if(fread(&fz, sizeof(float), 1, ifp) != 1)
                errxit("error:Failed to read grid\n");
			x[n]=i-3; y[n]=j-3; z[n]=fz;
			}
		}

	fclose(ifp);


	if(g)
		delete g;


	g=new ht_grid(nx, ny, z, x, y);

	g->x_dim=fx; g->y_dim=fy;


	free(x); free(y); free(z);
	return(nx);
	}

void
write_grid_ascii(const char *filename)
	{
	FILE *ofp;
	int i,j,n;
	float zf[49];
	int nx=7, ny=7;

	if((ofp=fopen(filename,"w"))==NULL)
		errxit("write_grid: can't create %s\n",filename);

	g->get_fixed(zf);

	for(j=n=0; j<ny; j++){
		for(i=0; i<nx; i++, n++){
			fprintf(ofp," %f",zf[n]);
			}
		fprintf(ofp,"\n");
		}
	fclose(ofp);
	}

void
write_grid(const char *filename)
	{
	FILE *ofp;
	int i,j,n;
//	float v[7];
	uint8_t nb;
	int nx, ny;
	float zf[49];

	if((ofp=fopen(filename,"w"))==NULL)
		errxit("read_grid: can't open %s\n",filename);

	nb=g->nx;
	if(fwrite(&nb, sizeof(uint8_t), 1, ofp) != 1)
        errxit("error:Failed to write grid size\n");
	if(g->ny != g->nx){
		nb=g->ny;
		if(fwrite(&nb, sizeof(uint8_t), 1, ofp) != 1)
			errxit("error:Failed to write grid size\n");
		}


	if(fwrite(&g->x_dim, sizeof(float), 1, ofp) != 1
	|| fwrite(&g->y_dim, sizeof(float), 1, ofp) != 1)
        errxit("error:Failed to write grid size\n");


	nx=g->nx; ny=g->ny;
	g->get_fixed(zf);

	for(j=n=0; j<ny; j++){
		for(i=0; i<nx; i++, n++){
			if(fwrite(&zf[n], sizeof(float), 1, ofp) != 1)
                errxit("error:Failed to write grid\n");
			}
		}

	fclose(ofp);
	return;
	}

int
main(int argc, char **argv)
	{
	set_debug(true);
	int loopcount = 20;
	char inputfile[1024];
	int nbad = 1;

	if (argc > 1) {
		sprintf(inputfile,"%s",argv[1]);
	} else {
		sprintf(inputfile,"/media/usb0/cartesian.grid");
	}

	while ((loopcount-- > 0) && (nbad > 0)) {
		read_grid(inputfile);
		if(debug_on())
			write_grid_ascii("/tmp/orig_grid.txt");

	//	g->fit();
		g->fit3();
		nbad=g->fix();
		db_printf("fix modified %d points",nbad);

		write_grid("/tmp/cartesian.grid");
		if(debug_on())
			write_grid_ascii("/tmp/fixed_grid.txt");

		db_printf("---------------\n\n");

	}
	return(0);
	}
