//#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

char *master="/boot/octopi-wpa-supplicant_master.txt";
char *working="/boot/octopi-wpa-supplicant.txt";

int
main(int argc, char **argv)
	{
	FILE *ifp, *ofp;
	char line[1024];
	char *cp;

	if(argc!=3){
		fprintf(stderr, "Usage: setwifi ssid psk\n");
		exit(1);
		}

	if((ifp=fopen(master, "r"))==NULL
	|| (ofp=fopen(working, "w"))==NULL){
		fprintf(stderr, "Can't open file\n");
		exit(2);
		}

	while(fgets(line, sizeof line, ifp)){
		if(line[0]=='#')	// don't modify comments
			goto putit;
		if(cp=strstr(line, "ssid="))
			sprintf(cp+5,"\"%s\"\n",argv[1]);
		if(cp=strstr(line, "psk="))
			sprintf(cp+4,"\"%s\"\n",argv[2]);
	putit:
		fputs(line, ofp);
		}

	fclose(ifp);
	fclose(ofp);
	return(0);
	}
