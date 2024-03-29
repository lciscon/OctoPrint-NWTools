$(function() {

    function NWToolsViewModel(parameters) {
        var self = this;

        self.settings = parameters[0];
        self.control = parameters[1];
        self.system = parameters[2];
        self.loginState = parameters[3];
        self.printerProfiles = parameters[4];
		self.printerState = parameters[5];

	    self.targetTemp = 0;
	    self.currentTemp = 0;
		self.currentTemp2 = 0;

		self.startedAction = 0;

		self.remoteNoticeVisible = false;
		self.probing = false;

		self.isErrorOrClosed = ko.observable(undefined);
        self.isOperational = ko.observable(undefined);
        self.isPrinting = ko.observable(undefined);
        self.isPaused = ko.observable(undefined);
        self.isError = ko.observable(undefined);
        self.isReady = ko.observable(undefined);
        self.isLoading = ko.observable(undefined);

        self.autoClose = ko.observable();

        self.autoCalibrating = 0;
        self.msgType = ko.observable();
    		self.msgTypes = ko.observableArray([{
    						name : 'Notice',
    						value : 'notice'
    					}, {
    						name : 'Error',
    						value : 'error'
    					}, {
    						name : 'Info',
    						value : 'info'
    					}, {
    						name : 'Success',
    						value : 'success'
    					}, {
    						name : 'Disabled',
    						value : 'disabled'
    					}
    				]);

		self._createToolEntry = function() {
            var entry = {
                name: ko.observable(),
                key: ko.observable(),
				showtest: ko.observable(),
                actual: ko.observable(0.0),
                target: ko.observable(0.0),
                newTarget: ko.observable(),
            };

            entry.newTargetValid = ko.pureComputed(function() {
                var value = entry.newTarget();

                try {
                    value = parseFloat(value);
                } catch (exc) {
                    return false;
                }

                return (value >= -999.99 && value <= 999.99);
            });

            return entry;
        };

		self.tool0_ZOffset = self._createToolEntry();
        self.tool0_ZOffset["name"](gettext("Z Offset"));
        self.tool0_ZOffset["key"]("tool0_ZOffset");
		self.tool0_ZOffset["showtest"](true);

		self.tool0_Raised = self._createToolEntry();
        self.tool0_Raised["name"](gettext("Raised"));
        self.tool0_Raised["key"]("tool0_Raised");
		self.tool0_Raised["showtest"](true);

		self.tool0_Locked = self._createToolEntry();
        self.tool0_Locked["name"](gettext("Locked"));
        self.tool0_Locked["key"]("tool0_Locked");
		self.tool0_Locked["showtest"](true);

		self.tool1_ZOffset = self._createToolEntry();
        self.tool1_ZOffset["name"](gettext("Z Offset"));
        self.tool1_ZOffset["key"]("tool1_ZOffset");
		self.tool1_ZOffset["showtest"](true);

		self.tool1_Raised = self._createToolEntry();
        self.tool1_Raised["name"](gettext("Raised"));
        self.tool1_Raised["key"]("tool1_Raised");
		self.tool1_Raised["showtest"](true);

		self.tool1_Locked = self._createToolEntry();
        self.tool1_Locked["name"](gettext("Locked"));
        self.tool1_Locked["key"]("tool1_Locked");
		self.tool1_Locked["showtest"](true);

		self.tool1_XOffset = self._createToolEntry();
        self.tool1_XOffset["name"](gettext("X Offset"));
        self.tool1_XOffset["key"]("tool1_XOffset");
		self.tool1_XOffset["showtest"](false);

		self.tool1_YOffset = self._createToolEntry();
        self.tool1_YOffset["name"](gettext("Y Offset"));
        self.tool1_YOffset["key"]("tool1_YOffset");
		self.tool1_YOffset["showtest"](false);

	function sleep (time) {
	    	return new Promise((resolve) => setTimeout(resolve, time));
	}

	self.formatFloat = function(newval) {
	    if (newval === undefined || !_.isNumber(newval)) return "-";
		return _.sprintf("%2.3f", newval);
	}

	self.fromCurrentData = function(data) {
		self._processStateData(data.state);
	};

	self._processStateData = function(data) {
		self.isErrorOrClosed(data.flags.closedOrError);
		self.isOperational(data.flags.operational);
		self.isPaused(data.flags.paused);
		self.isPrinting(data.flags.printing);
		self.isError(data.flags.error);
		self.isReady(data.flags.ready);
		self.isLoading(data.flags.loading);
	};

	self.fromResponse = function (data) {
//            console.log('MSL: got reply2 ' + data.tool0.actual);
	        self.currentTemp = parseFloat(data.tool0.actual);
	        if (data.tool1) {
		            self.currentTemp2 = parseFloat(data.tool1.actual);
            } else {
		            self.currentTemp2 = self.targetTemp2;
	        }
        };

	self.requestData = function() {
            $.ajax({
                url: API_BASEURL + "printer/tool",
                type: "GET",
                dataType: "json",
                success: self.fromResponse
            });
        };

// !!!
    self.onDataUpdaterPluginMessage = function(plugin, data) {
        if (plugin != "NWTools") {
            return;
        }

//		console.debug('Processing message...');

		if (data.action == "error") {
			self.startedAction = 0;  //make sure to clear out any actions I started

			NWToolsAlerts.errorAlert(data.text);
		} else if (data.action == "notice") {
			if (NWToolsAlerts.alertVisible()) {
				if (self.remoteNoticeVisible) {
					NWToolsAlerts.noticeAlert(data.text);
				}
			} else {
				self.remoteNoticeVisible = true;
				NWToolsAlerts.noticeAlert(data.text);
			}
		} else if (data.action == "closenotice") {
			if (self.remoteNoticeVisible) {
				self.closeAlert();
			}
		} else if (data.action == "gridcomplete") {
			if (self.startedAction == 1) {
				//the grid scan is done.  save the grid.
				sendPrinterCommand('M374'); //save the bed - triggers an action command that is used to fix the grid
				sendPrinterCommand('M400');
		        sendPrinterCommand('G0 Z2 F300');
				sendPrinterCommand('M400');
		  	  	sendPrinterCommand('M500'); //save changes
				NWToolsAlerts.noticeAlert("Saving Grid and Rebooting Controller...");
				self._postCommand("fixgrid", {});
			}
		} else if (data.action == "gridsave") {

		} else if (data.action == "gridfixed") {
			//fixgrid has completed
			if (self.startedAction == 1) {
				try {
					sleep(2);
					self.reconnectSerial();
				} finally {
					self.startedAction = 0;
				}
			}
//			self.remoteNoticeVisible = false;
			NWToolsAlerts.noticeAlert("Grid Calibration Complete!");
		} else if (data.action == "probecomplete") {
//			if (self.probing) {
//				self.closeRemoteAlert();
//		  	    self.closeAlert();
//			}
		} else if (data.action == "levelcomplete") {
			self._postCommand("get_leveling", {}, function(response) {
			  	if (response.levels) {
				  	curz = response.levels;
					var messageData
					var frontstr;
					var backstr;
					if (curz[2] < 0) {
						frontstr = Math.abs(curz[2].toFixed(1)).toString() + " turns CW";
					} else {
						frontstr = Math.abs(curz[2].toFixed(1)).toString() + " turns CCW";
					}

					if (curz[1] < 0) {
						backstr = Math.abs(curz[1].toFixed(1)).toString() + " turns CW";
					} else {
						backstr = Math.abs(curz[1].toFixed(1)).toString() + " turns CCW";
					}

					if ((Math.abs(curz[1]) < .1) && (Math.abs(curz[2]) < .1)) {
						messageData = "Bed is level!.  Running Calibration...";
						if (self.startedAction == 1) {
							self.calibrateBedHeated();
						}
					} else {
						messageData = "Adjust the screws and then re-run calibration: Center: " + frontstr + " Right: " + backstr;
						self.startedAction = 0;
					}

//					self.remoteNoticeVisible = false;
					NWToolsAlerts.noticeAlert(messageData);
					return;
			  	}
	  	  	});
		} else if (data.action == "update") {
			if (typeof data.tool0_ZOffset !== 'undefined') {
				self.tool0_ZOffset["actual"](data.tool0_ZOffset);
				self.tool0_ZOffset["target"](data.tool0_ZOffset);
			}
			if (typeof data.tool1_ZOffset !== 'undefined') {
				self.tool1_ZOffset["actual"](data.tool1_ZOffset);
				self.tool1_ZOffset["target"](data.tool1_ZOffset);
			}
			if (typeof data.tool0_Raised !== 'undefined') {
				self.tool0_Raised["actual"](data.tool0_Raised);
				self.tool0_Raised["target"](data.tool0_Raised);
			}
			if (typeof data.tool0_Locked !== 'undefined') {
				self.tool0_Locked["actual"](data.tool0_Locked);
				self.tool0_Locked["target"](data.tool0_Locked);
			}
			if (typeof data.tool1_Raised !== 'undefined') {
				self.tool1_Raised["actual"](data.tool1_Raised);
				self.tool1_Raised["target"](data.tool1_Raised);
			}
			if (typeof data.tool1_Locked !== 'undefined') {
				self.tool1_Locked["actual"](data.tool1_Locked);
				self.tool1_Locked["target"](data.tool1_Locked);
			}
			if (typeof data.tool1_XOffset !== 'undefined') {
				self.tool1_XOffset["actual"](data.tool1_XOffset);
				self.tool1_XOffset["target"](data.tool1_XOffset);
			}
			if (typeof data.tool1_YOffset !== 'undefined') {
				self.tool1_YOffset["actual"](data.tool1_YOffset);
				self.tool1_YOffset["target"](data.tool1_YOffset);
			}
		}

	}


	function sendPrinterCommand (cmdstr) {
	   console.debug('MSL: sending cmd: '+cmdstr);
	   OctoPrint.control.sendGcode(cmdstr);
//       self.control.sendCustomCommand({ command: cmdstr });
   	};

	self.sendRemoteAlert = function(message) {
		//if I am sending a notice, then there can't be a remote notice visible locally!
		self.remoteNoticeVisible = false;
		self._postCommand("show_notice", {message: message});
   	};

	self.closeRemoteAlert = function() {
		self._postCommand("close_notice", {});
   	};

	self.closeAlert = function() {
		self.remoteNoticeVisible = false;
		NWToolsAlerts.closeAlert();
   	};

	self.extrusionRunning = false;
	self.extrusionDirection = 1;

	self.extrusionTimer = function() {
	    var messageCmd = "";

	    //extrude a bit
	    if (self.extrusionDirection == 1) {
               	sendPrinterCommand('G1 E1 F100');
	    } else {
              	sendPrinterCommand('G1 E-1 F100');
	    }
	    if (self.extrusionRunning) {
		    setTimeout(self.extrusionTimer, 1000);
	    } else {
 		    console.log('Finished running! ');
	    }
	};

	//new PNotify({
	//  title: 'Pop Up Message',
	//  text: 'here',
	//  type: self.msgType(),
	//  hide: self.autoClose()
	//  });

	self.tempCallback = function () {

	};

	self.tempTimer = function () {
	    var messageCmd = "";

	    self.requestData();
	    var stillRunning = false;

	    if (self.targetTemp > 0) {
	      if (self.currentTemp < self.targetTemp) {
	        stillRunning = true;
	      }
	    } else if (self.targetTemp2 > 0) {
	      if (self.currentTemp2 < self.targetTemp2) {
	        stillRunning = true;
	      }
	    }

		if (stillRunning) {
	        setTimeout(self.tempTimer, 1000);
	    } else {
	        console.log('Finished heatup! ');
			//dont call closeRemoteNotcie() here...not needed and it causes timing issues
			self.closeAlert();
			if ((self.targetTemp > 0) || (self.targetTemp2 > 0)) {
				if (self.tempCallback) {
				   	self.tempCallback();
				}
			}
	    }
	};

	self.cancelPreheat = function () {
		console.log('Cancelling preheat... ');
		self.targetTemp = 0;
		self.targetTemp2 = 0;
		self.closeRemoteAlert();
	}

	self.preheat = function (toolnumber, material, callback) {
	      var tipTemp = 0;
	      var bedTemp = 0;

	      if (material == 0) {
	        tipTemp = 220;
	        bedTemp = 0;
	      } else if (material == 1) {
	        tipTemp = 220;
	        bedTemp = 60;
	      } else {
	        tipTemp = 235;
	        bedTemp = 100;
	      }

		  console.log('Starting heatup! ');

		  self.sendRemoteAlert("Preheating...");
		  NWToolsAlerts.preheatAlert().then(result => {
			  // if user clicks yes
	          if (result.value) {
	          }
	          // if user clicks no
	          else if (result.dismiss === Swal.DismissReason.cancel) {
				  self.cancelPreheat();
	          }
		  });

	    	//begin hotend preheat
	      sendPrinterCommand('M42');
	      sendPrinterCommand('M140 S' + bedTemp);
//		  sendPrinterCommand('M190 S' + bedTemp);
//	      sendPrinterCommand('T' + toolnumber);
	      sendPrinterCommand('M104 T' + toolnumber + ' S' + tipTemp);
//		  sendPrinterCommand('M109 S' + tipTemp);

	      if (toolnumber == 0) {
		      self.targetTemp = tipTemp;
	          self.targetTemp2 = 0;
	      } else {
	          self.targetTemp = 0;
	          self.targetTemp2 = tipTemp;
	      }

	      self.tempCallback = callback;
	      self.tempTimer();
   	};

    self.preheat1 = function() {
	   	self.preheat(0,0,null);
    };

	self.preheat2 = function() {
	    	self.preheat(1,0,null);
	};

	self.coolDown = function(toolnumber) {
		sendPrinterCommand('M42');
		sendPrinterCommand('M140 S0');
//		sendPrinterCommand('T' + toolnumber);
		sendPrinterCommand('M104 T'+toolnumber+' S0');
	};

  	self.lockHead1 = function() {
    	sendPrinterCommand('M672 V0 P-1');
	};

  	self.releaseHead1 = function() {
    	sendPrinterCommand('M672 V0 P0');
	};

  	self.liftHead1 = function() {
    	sendPrinterCommand('M672 V0 P1');
	};

  	self.lockHead2 = function() {
    	sendPrinterCommand('M672 V1 P-1');
	};

  	self.releaseHead2 = function() {
    	sendPrinterCommand('M672 V1 P0');
	};

  	self.liftHead2 = function() {
    	sendPrinterCommand('M672 V1 P1');
	};

   	self.turnOnExtruder = function(direction) {
	    self.extrusionRunning = true;
	   	self.extrusionDirection = direction;
	    self.extrusionTimer();
    };

	self.turnOffExtruder = function() {
	    	self.extrusionRunning = false;
	};

	self.loadFilamentComplete = function() {
		self.closeRemoteAlert();
	    self.turnOffExtruder();
//            sendPrinterCommand('G90'); //switch back to absolute mode

		if (!self.printerState.isPaused()) {
			sendPrinterCommand('M104 S0'); //turn off heater
		}
	};


	self.loadFilamentPreheated = function() {

        sendPrinterCommand('G91');
        self.turnOnExtruder(1);
		self.sendRemoteAlert("Loading Filament...");
		NWToolsAlerts.loadFilamentAlert().then(result => {
		  // if user clicks yes
		  if (result.value) {
			  self.loadFilamentComplete();
		  }
	    });
	};

	// this will be called when they press the loadFilament button
	self.loadFilament = function(toolnumber) {
		sendPrinterCommand('T' + toolnumber);

		//if there is a paused print, then don't change the temperatures
		if (self.printerState.isPaused()) {
			self.loadFilamentPreheated();
		} else {
	    	self.preheat(toolnumber, 0, self.loadFilamentPreheated);
		}
	};

	self.loadFilament1 = function() {
	    self.loadFilament(0);
	};

	self.loadFilament2 = function() {
	    self.loadFilament(1);
	};

    self.unloadFilamentComplete = function() {
		self.closeRemoteAlert();
    	self.turnOffExtruder();
//            sendPrinterCommand('G90');

		if (!self.printerState.isPaused()) {
        	sendPrinterCommand('M104 S0');
		}
    };

   self.unloadFilamentPreheated = function() {
    	sendPrinterCommand('G91');
    	//move forward a bit to remove blobs
        sendPrinterCommand('G1 E5 F100');
        self.turnOnExtruder(-1);

		self.sendRemoteAlert("Unloading Filament...");
		NWToolsAlerts.unloadFilamentAlert().then(result => {
		  // if user clicks yes
		  if (result.value) {
			  self.unloadFilamentComplete();
		  }
		});
	};

	//this will be called when they press the unloadFilament button
	self.unloadFilament = function(toolnumber) {

		//if there is a paused print, then don't change the temperatures
		if (self.printerState.isPaused()) {
			self.unloadFilamentPreheated();
		} else {
			self.preheat(toolnumber, 0, self.unloadFilamentPreheated);
		}
	};

    self.unloadFilament1 = function() {
        self.unloadFilament(0);
    };

    self.unloadFilament2 = function() {
        self.unloadFilament(1);
    };

	self.rebootController = function() {
		self.sendRemoteAlert("Rebooting Controller...");
		NWToolsAlerts.rebootAlert();
		self.disconnectSerial();
		self._postCommand("reboot_controller", {}, function(response) {
			sleep(4);
			self.reconnectSerial();
			self.closeRemoteAlert();
			self.closeAlert();
	    });
	};

	self.lightsOn = function() {
		self._postCommand("lights_on", {});
	    sendPrinterCommand('M5');
	};

	self.lightsOff = function() {
		self._postCommand("lights_off", {});
       sendPrinterCommand('M3');
	};

    self.cabinetOn = function() {
	  self._postCommand("cabinet_on", {});
	    sendPrinterCommand('M282');
	};

	self.cabinetOff = function() {
	  self._postCommand("cabinet_off", {});
      sendPrinterCommand('M283');
	};

	self.unloadPrint = function() {
      sendPrinterCommand('G0 Z250');
	};

	self.parkPrinthead = function() {
      sendPrinterCommand('G28.2');
	};

	self.resetDefaultsGo = function() {
      sendPrinterCommand('M502');
	  sendPrinterCommand('M400');
	  self.rebootController();
	};

	self.resetDefaults = function() {
		NWToolsAlerts.resetDefaultAlert().then(result => {
		  if (result.value) {
			  self.resetDefaultsGo();
		  }
	    });
	};

	self.testCAM = function() {
		sendPrinterCommand('M676');
	};

	self.forwardCAM = function() {
		sendPrinterCommand('M518 E5');
	};


	self.autoCalibrateRun = function () {
		sendPrinterCommand('M400');
		sendPrinterCommand('G91');
		sendPrinterCommand('G0 Z10 F300');
		sendPrinterCommand('G90');
		sendPrinterCommand('M400');
		sendPrinterCommand('G28');
		sendPrinterCommand('G30.1 Q V0');
		sendPrinterCommand('G0 Z0 F300');
	};

	self.autoCalibrateHeated = function () {
//		NWToolsAlerts.probingAlert();
//		self.sendRemoteAlert("Probing...");
		NWToolsAlerts.closeAlert();
		self.closeRemoteAlert();
		self.probing = true;

        self.autoCalibrateRun();
        self.lockHead1();

	};

//	self.autoCalibrateGo = function() {
//	    self.preheat(0, 1, self.autoCalibrateHeated);
//	};

	self.autoCalibrate = function() {
		NWToolsAlerts.probeTestAlert().then(result => {
          // if user clicks yes
		  if (result.value) {
			  self.preheat(0, 1, self.autoCalibrateHeated);
//			  self.autoCalibrateGo();
		  }
	  });
	};


	self.autoCalibrate2Run = function () {
		sendPrinterCommand('M400');
		sendPrinterCommand('G91');
		sendPrinterCommand('G0 Z10 F300');
		sendPrinterCommand('G90');
		sendPrinterCommand('M400');
		sendPrinterCommand('G28');
		sendPrinterCommand('G30.1 Q V1');
		sendPrinterCommand('G0 Z0 F300');
	};

	self.autoCalibrate2Heated = function () {
//		NWToolsAlerts.probingAlert();
//		self.sendRemoteAlert("Probing...");
		NWToolsAlerts.closeAlert();
		self.closeRemoteAlert();
		self.probing = true;

      self.autoCalibrate2Run();
      self.lockHead2();
	};

//	self.autoCalibrate2Go = function() {
//	    self.preheat(1, 1, self.autoCalibrate2Heated);
//	};

	self.autoCalibrate2 = function() {
		NWToolsAlerts.probeTestAlert().then(result => {
		  // if user clicks yes
			if (result.value) {
				self.preheat(1, 1, self.autoCalibrate2Heated);
//				self.autoCalibrate2Go();
			}
	  });
	};

	self.updateFirmware = function() {
	  NWToolsAlerts.firmStartAlert();

  	  self._postCommand("firmware_exists", {}, function(response) {
  		  console.log('File Exists value: ' + response.file_exists);

  		  if (response.file_exists == 0) {
			  NWToolsAlerts.firmErrorAlert();
  			  return;
  		  }

  		  self._postCommand("update_firmware", {}, function(response) {
  			  if (response.success) {
				  NWToolsAlerts.firmDoneAlert();
  				  return;
  			  }
  		  });
  	  });
    };

	self.calibrateBedHeated = function () {
//      self.resetCalibration();  done in level bed routine now
//      self.autoCalibrateRun();
	  self.startedAction = 1;

	  sendPrinterCommand('M400');
	  sendPrinterCommand('G91');
	  sendPrinterCommand('G0 Z2 F300');
	  sendPrinterCommand('G90');
	  sendPrinterCommand('M400');
	  sendPrinterCommand('G30.1 Q V0');
      sendPrinterCommand('G91');
      sendPrinterCommand('G0 Z2 F300');
      sendPrinterCommand('G90');
      sendPrinterCommand('M400');
	  sendPrinterCommand('G32 V0');  //grid probe
	  self.coolDown(0);
    };

/*
    self.calibrateBed = function() {
       self.preheat(0, 1, self.calibrateBedHeated);
    };

    self.calibrateBed2 = function() {
       self.preheat(0, 2, self.calibrateBedHeated);
    };
*/

	self.levelBedHeated = function() {
		NWToolsAlerts.levelBedAlert();
		self.sendRemoteAlert("Leveling Bed...");
		self.resetCalibration();

		self.startedAction = 1;
  		sendPrinterCommand('M400');
  	    sendPrinterCommand('G91');
  	    sendPrinterCommand('G0 Z10 F300');
  	    sendPrinterCommand('G90');
  	    sendPrinterCommand('M400');
  	    sendPrinterCommand('G28');
		sendPrinterCommand('M400');
  	  	sendPrinterCommand('G33 V0');
//		self.coolDown(0);  Do not cool down, since we now run the bed calibration next
    };

    self.levelBed = function() {
		NWToolsAlerts.calibrateTestAlert().then(result => {
		  // if user clicks yes
			if (result.value) {
				self.preheat(0, 1, self.levelBedHeated);
			}
	  });
    };

    self.levelBed2 = function() {
		NWToolsAlerts.calibrateTestAlert().then(result => {
		  // if user clicks yes
			if (result.value) {
				self.preheat(0, 2, self.levelBedHeated);
			}
	  });
    };


    self.calibrateDone = function () {
        sendPrinterCommand('M511');
    };

    self.calibrateSensor = function() {
      self.releaseHead1();
      self.releaseHead2();
      sendPrinterCommand('M510');

	  NWToolsAlerts.calibratingAlert().then(result => {
		// if user clicks yes
		  if (result.value) {
			  self.calibrateDone();
		  }
	  });
    };


    self.resetCalibration = function() {
      sendPrinterCommand('M374.1');
      sendPrinterCommand('M561');
  	};

	self.resetCalibrationPrompt = function() {
		NWToolsAlerts.resetAlert().then(result => {
			// if user clicks yes
			if (result.value) {
				self.resetCalibration();
			}
			// if user clicks no
			else if (result.dismiss === Swal.DismissReason.cancel) {
			}
		});
	};


	self.filterCalibration = function() {
		self._postCommand("fixgrid", {});
  	};

//---------

	self.showTest = function(item) {
		return item["showtest"];
	};


	self.testTarget = function(item, form) {
		var value = item.newTarget();

		if (value === undefined || (typeof(value) === "string" && value.trim() === "")) {
			value = item.target();
		}

	  if (item.key() === "tool0_ZOffset") {
		  self.autoCalibrate();
	  } else if (item.key() === "tool1_ZOffset") {
		  self.autoCalibrate2();
	  } else if (item.key() === "tool0_Raised") {
		  sendPrinterCommand('M280 S' + value);
	  } else if (item.key() === "tool0_Locked") {
		  sendPrinterCommand('M280 S' + value);
	  } else if (item.key() === "tool1_Raised") {
		  sendPrinterCommand('M280.1 S' + value);
	  } else if (item.key() === "tool1_Locked") {
		  sendPrinterCommand('M280.1 S' + value);
	  } else if (item.key() === "tool1_XOffset") {
		  //nada
	  } else if (item.key() === "tool1_YOffset") {
		  //nada
	  }

	};

  self.handleEnter = function(event, type, item) {
	  if (event.keyCode === 13) {
		  if (type === "target") {
			  self.setTarget(item)
				  .done(function() {
					  event.target.blur();
				  });
		  }
	  }
  };

  self.handleFocus = function(event, type, item) {
	  if (type === "target") {
		  var value = item.newTarget();
		  if (value === undefined || (typeof(value) === "string" && value.trim() === "")) {
			  item.newTarget(item.target());
		  }
//		  window.setTimeout(function() {
//			  event.target.select();
//		  }, 0);
	  }
  };

  self.setTargetToValue = function(item, value) {
//              self.clearAutosendTarget(item);

      try {
          value = parseFloat(value);
      } catch (ex) {
          return OctoPrintClient.createRejectedDeferred();
      }

      if (value < -999.99 || value > 999.99) return OctoPrintClient.createRejectedDeferred();

	  if (item.key() === "tool0_ZOffset") {
		  sendPrinterCommand('M670 O' + value);
		  vdiff = value - item.target();
		  console.log('vdiff ' + vdiff);
		  sendPrinterCommand('G91');
		  sendPrinterCommand('G0 Z' - vdiff);
		  sendPrinterCommand('G90');
	  } else if (item.key() === "tool1_ZOffset") {
		  sendPrinterCommand('M670 Q' + value);
		  vdiff = value - item.target();
		  console.log('vdiff ' + vdiff);
		  sendPrinterCommand('G91');
		  sendPrinterCommand('G0 Z' - vdiff);
		  sendPrinterCommand('G90');
	  } else if (item.key() === "tool0_Raised") {
		  sendPrinterCommand('M673 A' + value);
	  } else if (item.key() === "tool0_Locked") {
		  sendPrinterCommand('M673 B' + value);
	  } else if (item.key() === "tool1_Raised") {
		  sendPrinterCommand('M673 C' + value);
	  } else if (item.key() === "tool1_Locked") {
		  sendPrinterCommand('M673 D' + value);
	  } else if (item.key() === "tool1_XOffset") {
		  sendPrinterCommand('M675.1 X' + value);
	  } else if (item.key() === "tool1_YOffset") {
		  sendPrinterCommand('M675.1 Y' + value);
	  }

	  sendPrinterCommand('M400');
	  sendPrinterCommand('M500');
	  sendPrinterCommand('M400');
	  item.target(value);
	  item.newTarget("");
	  self.refreshSettings();

  };

  self.setTarget = function(item, form) {
    var value = item.newTarget();

      if (form !== undefined) {
          $(form).find("input").blur();
      }
      if (value === undefined || (typeof(value) === "string" && value.trim() === "")) return OctoPrintClient.createRejectedDeferred();

//      self.clearAutosendTarget(item);
      return self.setTargetToValue(item, value);
  };

  self.incrementTarget = function(item) {
    var value = item.newTarget();
	console.debug('Incrementing value: ' + value);

      if (value === undefined || (typeof(value) === "string" && value.trim() === "")) {
          value = item.target();
      }
	  console.debug('New value: ' + value);

      try {
          value = parseFloat(value);
		  console.debug('New value2: ' + value);

          if (value > 999.99) return;
		  value = value + 0.025;
		  value = Number((value).toFixed(3));
          item.newTarget(value);
		  console.debug('New target: ' + item.newTarget());

//          self.autosendTarget(item);
      } catch (ex) {
          // do nothing
      }
  };

  self.decrementTarget = function(item) {
      var value = item.newTarget();
      if (value === undefined || (typeof(value) === "string" && value.trim() === "")) {
          value = item.target();
      }
      try {
          value = parseFloat(value);
          if (value < -999.99) return;
		  value = value - 0.025;
		  value = Number((value).toFixed(3));
          item.newTarget(value);
//          self.autosendTarget(item);
      } catch (ex) {
          // do nothing
      }
  };


// ----

	self.refreshSettings = function() {
		sendPrinterCommand('M503');
	};

	self.onStartupComplete = function() {
		self.refreshSettings();
	};

	self.onEventConnected = function(payload) {
		self.refreshSettings();
	};

	self.unmountCtrl = function() {
		console.log('Unmounting file system...');
		self._postCommand("umountctl", {});
	};

	self.mountCtrl = function() {
		console.log('Mounting file system...');
		self._postCommand("mountctl", {});
	};

	self._postCommand = function (command, data, successCallback, failureCallback, alwaysCallback, timeout) {
	    var payload = _.extend(data, {command: command});

	    var params = {
	        url: API_BASEURL + "plugin/NWTools",
	        type: "POST",
	        dataType: "json",
	        data: JSON.stringify(payload),
	        contentType: "application/json; charset=UTF-8",
	        success: function(response) {
	            if (successCallback) successCallback(response);
	        },
	        error: function() {
	            if (failureCallback) failureCallback();
	        },
	        complete: function() {
	            if (alwaysCallback) alwaysCallback();
	        }
	    };

	    if (timeout != undefined) {
	        params.timeout = timeout;
	    }

	    $.ajax(params);
	};

	self.disconnectSerial = function () {
		console.log('Disconnect from controller');

		var payload = {command: "disconnect"};

	    $.ajax({
	        url: API_BASEURL + "connection",
	        type: "POST",
	        dataType: "json",
			data: JSON.stringify(payload),
			contentType: "application/json; charset=UTF-8",
			success: function(response) {
	        },
	    });

	};

	self.reconnectSerial = function () {
		console.log('Reconnecting to controller');

		var payload = {command: "connect"};

	    $.ajax({
	        url: API_BASEURL + "connection",
	        type: "POST",
	        dataType: "json",
			data: JSON.stringify(payload),
			contentType: "application/json; charset=UTF-8",
			success: function(response) {
	        },
	    });

		var payload2 = {command: "connect"};

	    $.ajax({
	        url: API_BASEURL + "connection",
	        type: "POST",
	        dataType: "json",
			data: JSON.stringify(payload2),
			contentType: "application/json; charset=UTF-8",
			success: function(response) {
	        },
	    });

	};


    }

    // This is how our plugin registers itself with the application, by adding some configuration
    // information to the global variable OCTOPRINT_VIEWMODELS
    OCTOPRINT_VIEWMODELS.push([
        // This is the constructor to call for instantiating the plugin
        NWToolsViewModel,

        // This is a list of dependencies to inject into the plugin, the order which you request
        // here is the order in which the dependencies will be injected into your view model upon
        // instantiation via the parameters argument
        ["settingsViewModel", "controlViewModel", "systemViewModel", "loginStateViewModel", "printerProfilesViewModel", "printerStateViewModel"],

        // Finally, this is the list of selectors for all elements we want this view model to be bound to.
        ["#tab_plugin_NWTools", "#tab_plugin_NWTools_2"]
    ]);

});



//    new PNotify({
//      title: 'Increment Target0',
//      text: value,
//      type: self.msgType(),
//      hide: self.autoClose()
//      });
