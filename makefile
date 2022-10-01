#!/usr/bin/make

DIRS = src
DIRSCLEAN = $(addsuffix .clean,$(DIRS))

all:	$(DIRS)
	@echo Building OctoPrint-GridNorm
	@ $(MAKE) -C native/src

clean: $(DIRSCLEAN)

depends: $(DIRS)
	sudo apt-get install liblapack-dev --fix-missing --assume-yes
	sudo apt-get install libblas-dev --assume-yes
	sudo apt-get install libboost-dev --assume-yes
	sudo apt-get install libarmadillo-dev --assume-yes

install: $(DIRS)
	sudo cp ./native/bin/* /usr/local/bin
	sudo cp ./native/scripts/* /usr/local/bin
	sudo cp ./native/usbmount/* /etc/usbmount/mount.d
	sudo cp ./native/boot/* /boot
	sudo chmod 755 /usr/local/bin/fixgrid
	sudo chmod 755 /usr/local/bin/fixsudo
	sudo chmod 755 /usr/local/bin/machine
	sudo chmod 755 /usr/local/bin/lights
	sudo chmod 755 /usr/local/bin/cabinet
	sudo chmod 755 /usr/local/bin/sethostname
	sudo chmod 755 /usr/local/bin/netcmd
	sudo chmod 755 /usr/local/bin/setwifi
	sudo chmod 755 /usr/local/bin/updatefirm
	sudo chmod 755 /usr/local/bin/checkfirm
	sudo chmod 755 /usr/local/bin/mountctl
	sudo chmod 755 /usr/local/bin/umountctl
	sudo chmod 755 /usr/local/bin/umountctl
	sudo chmod 755 /usr/local/bin/movefiles
	sudo chmod 755 /usr/local/bin/changewifi
	sudo chmod 755 /etc/usbmount/mount.d/10_checkmount

$(DIRSCLEAN): %.clean:
	@echo Cleaning $*
	@ $(MAKE) -C $*  clean

debug:	$(DIRS)
	@ $(MAKE) -C native/src debug

.PHONY: all $(DIRS) $(DIRSCLEAN) debug-store flash upload debug console dfu
