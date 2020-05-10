#!/usr/bin/make

DIRS = src
DIRSCLEAN = $(addsuffix .clean,$(DIRS))

all:	$(DIRS)
	@echo Building NWTools utils
	@ $(MAKE) -C src

clean: $(DIRSCLEAN)

install: $(DIRS)
	sudo cp ./bin/* /usr/local/bin
	sudo cp ./scripts/* /usr/local/bin
	sudo chmod 755 /usr/local/bin/fixgrid
	sudo chmod 755 /usr/local/bin/machine
	sudo chmod 755 /usr/local/bin/lights
	sudo chmod 755 /usr/local/bin/sethostname
	sudo chmod 755 /usr/local/bin/netcmd
	sudo chmod 755 /usr/local/bin/setwifi
	sudo chmod 755 /usr/local/bin/updatefirm
	sudo chmod 755 /usr/local/bin/checkfirm

$(DIRSCLEAN): %.clean:
	@echo Cleaning $*
	@ $(MAKE) -C $*  clean

debug:	$(DIRS)
	@ $(MAKE) -C src debug

.PHONY: all $(DIRS) $(DIRSCLEAN) debug-store flash upload debug console dfu
