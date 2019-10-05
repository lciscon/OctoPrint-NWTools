$(function() {

    function NWToolsViewModel(parameters) {
        var self = this;

        self.settings = parameters[0];
        self.control = parameters[1];
        self.system = parameters[2];
        self.loginState = parameters[3];
        self.printerProfiles = parameters[4];

	      self.targetTemp = 0;
	      self.currentTemp = 0;
		    self.currentTemp2 = 0;
        self.currentZDelta = 0;
        self.currentZDelta2 = 0;

        self.actual = ko.observable(-0.1);
        self.target = ko.observable(2);
        self.newTarget = ko.observable(3);

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


    	self.actionTriggerTemplate = ko.observable(undefined);
	    self.actionTriggerCallback = function () {
	    };

	    self.showActionTriggerDialog = function (data, callback) {
      		var actionTriggerDialog = $("#action_trigger_dialog");
      		var actionTriggerDialogAck = $(".action_trigger_dialog_acknowledge", actionTriggerDialog);

      		$(".action_trigger_title", actionTriggerDialog).text(data.title);
      		$(".action_trigger_dialog_message", actionTriggerDialog).text(data.message);
      		actionTriggerDialogAck.unbind("click");
		      self.actionTriggerCallback = callback;

      		actionTriggerDialogAck.bind("click", function (e) {
     		   e.preventDefault();
    		   $("#action_trigger_dialog").modal("hide");
                   if (self.actionTriggerCallback !== null) {
                        self.actionTriggerCallback();
                   }

//   		   self.showControls();
      		});
      		actionTriggerDialog.modal({
     		   show: 'true',
    		    backdrop:'static',
   		     keyboard: false
      		});

    	};

    	function sleep (time) {
 	    return new Promise((resolve) => setTimeout(resolve, time));
	}

	self.fromResponse = function (data) {
            console.log('MSL: got reply2 ' + data.tool0.actual);
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

    self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin != "NWTools") {
                return;
            }

//            new PNotify({
//              title: 'Pop Up Message',
//              text: data.zoffset,
//              type: self.msgType(),
//              hide: self.autoClose()
//              });

              self.actual = 123;
              self.target = 234;
		}

	function sendPrinterCommand (cmdstr) {
	   console.debug('MSL: sending cmd: '+cmdstr);
           self.control.sendCustomCommand({ command: cmdstr });
   	};

  function sendSystemCommand (cmdstr) {
	   console.debug('MSL: sending cmd: '+cmdstr);
           self.system.triggerCommand({ command: cmdstr });
   	};


	self.hideActionTriggerDialog = function () {
           var actionTriggerDialog = $("#action_trigger_dialog");
           $("#action_trigger_dialog").modal("hide");
//           self.showControls();
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
      		      self.hideActionTriggerDialog();
        		    if (self.tempCallback) {
        		    	self.tempCallback();
        		    }
            }
        };


	self.preheat = function (toolnumber, material, callback) {
        	var messageType = "preheating";
        	var messageData = {message:"", title:""};
          var tipTemp = 0;
          var bedTemp = 0;

          if (material == 0) {
            tipTemp = 220;
            bedTemp = 0;
          } else if (material == 1) {
            tipTemp = 220;
            bedTemp = 60;
          } else {
            tipTemp = 250;
            bedTemp = 100;
          }

		      self.tempCallback = callback;
        	messageData.title = "Preheating...";
        	self.actionTriggerTemplate(messageType);
        	self.showActionTriggerDialog(messageData, null);

        	//begin hotend preheat
          sendPrinterCommand('M42');
          sendPrinterCommand('M190 S' + bedTemp);
        	sendPrinterCommand('T' + toolnumber);
        	sendPrinterCommand('M109 S' + tipTemp);

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

  self.lockHead1 = function() {
    sendPrinterCommand('M672 T0 P-1');
	};

  self.releaseHead1 = function() {
    sendPrinterCommand('M672 T0 P0');
	};

  self.liftHead1 = function() {
    sendPrinterCommand('M672 T0 P1');
	};

  self.lockHead2 = function() {
    sendPrinterCommand('M672 T1 P-1');
	};

  self.releaseHead2 = function() {
    sendPrinterCommand('M672 T1 P0');
	};

  self.liftHead2 = function() {
    sendPrinterCommand('M672 T1 P1');
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
	    self.turnOffExtruder();
//            sendPrinterCommand('G90'); //switch back to absolute mode
            sendPrinterCommand('M104 S0'); //turn off heater
	};


	self.loadFilamentPreheated = function() {
            var messageType = "loading";
            var messageData = {message:"", title:"Load Filament"};

            sendPrinterCommand('G91');
            self.turnOnExtruder(1);
            self.actionTriggerTemplate(messageType);
            self.showActionTriggerDialog(messageData, self.loadFilamentComplete);
	};

	// this will be called when they press the loadFilament button
	self.loadFilament = function(toolnumber) {
	    self.preheat(toolnumber, 0, self.loadFilamentPreheated);
	};

	self.loadFilament1 = function() {
	    self.loadFilament(0);
	};

	self.loadFilament2 = function() {
	    self.loadFilament(1);
	};

        self.unloadFilamentComplete = function() {
	    self.turnOffExtruder();
//            sendPrinterCommand('G90');
            sendPrinterCommand('M104 S0');
        };

       self.unloadFilamentPreheated = function() {
            var messageType = "unloading";
            var messageData = {message:"", title:"Unload Filament"};

	    sendPrinterCommand('G91');
	    //move forward a bit to remove blobs
            sendPrinterCommand('G1 E5 F100');
            self.turnOnExtruder(-1);
            self.actionTriggerTemplate(messageType);
            self.showActionTriggerDialog(messageData, self.unloadFilamentComplete);
	};

	//this will be called when they press the unloadFilament button
	self.unloadFilament = function(toolnumber) {
	    self.preheat(toolnumber, 0, self.unloadFilamentPreheated);
	};

        self.unloadFilament1 = function() {
            self.unloadFilament(0);
        };

        self.unloadFilament2 = function() {
            self.unloadFilament(1);
        };

	self.lightsOn = function() {
	    sendPrinterCommand('M5');
      //new PNotify({
      //  title: 'Pop Up Message',
      //  text: 'here',
      //  type: self.msgType(),
      //  hide: self.autoClose()
      //  });
	};

	self.lightsOff = function() {
      sendPrinterCommand('M3');
	};

  self.cabinetOn = function() {
	    sendPrinterCommand('M282');
	};

	self.cabinetOff = function() {
      sendPrinterCommand('M283');
	};

	self.unloadPrint = function() {
      sendPrinterCommand('G0 Z250');
	};

	self.autoCalibrateRun = function () {
    sendPrinterCommand('M400');
    sendPrinterCommand('G91');
    sendPrinterCommand('G0 Z10 F300');
    sendPrinterCommand('G90');
    sendPrinterCommand('M400');
    sendPrinterCommand('G28');
//    sendPrinterCommand('G0 Z1');
      sendPrinterCommand('G30.1 Q V0');
      sendPrinterCommand('G0 Z0 F300');
	};

	self.autoCalibrateHeated = function () {
      self.autoCalibrateRun();
      self.lockHead1();
	};

	self.autoCalibrate = function() {
	    self.preheat(0, 1, self.autoCalibrateHeated);
	};

  self.moveUp = function() {
    sendPrinterCommand('M400');
    sendPrinterCommand('G91');
    sendPrinterCommand('G1 Z-.025');
    sendPrinterCommand('M400');
    sendPrinterCommand('G90');
    sendPrinterCommand('G95 Z.025');
    self.currentZDelta = self.currentZDelta + 0.025;
	};

  self.moveDown = function() {
    sendPrinterCommand('M400');
    sendPrinterCommand('G91');
    sendPrinterCommand('G1 Z.025');
    sendPrinterCommand('M400');
    sendPrinterCommand('G90');
    sendPrinterCommand('G95 Z-.025');
    self.currentZDelta = self.currentZDelta - 0.025;
	};

  self.setZOffset = function() {
    sendPrinterCommand('M670 P' + self.currentZDelta);
    sendPrinterCommand('M500');
    self.currentZDelta = 0;
  };

  self.autoCalibrateHeated2 = function () {
    sendPrinterCommand('M400');
    sendPrinterCommand('G91');
    sendPrinterCommand('G0 Z10 F300');
    sendPrinterCommand('G90');
    sendPrinterCommand('M400');
    sendPrinterCommand('G28');
    sendPrinterCommand('G30.1 Q V1');
    sendPrinterCommand('G0 Z0 F300');
    self.lockHead2();
	};

	self.autoCalibrate2 = function() {
	    self.preheat(1, 1, self.autoCalibrateHeated2);
	};

  self.moveUp2 = function() {
    sendPrinterCommand('M400');
    sendPrinterCommand('G91');
    sendPrinterCommand('G1 Z-.025');
    sendPrinterCommand('M400');
    sendPrinterCommand('G90');
    sendPrinterCommand('G95 Z.025');
    self.currentZDelta2 = self.currentZDelta2 + 0.025;
	};

  self.moveDown2 = function() {
    sendPrinterCommand('M400');
    sendPrinterCommand('G91');
    sendPrinterCommand('G1 Z.025');
    sendPrinterCommand('M400');
    sendPrinterCommand('G90');
    sendPrinterCommand('G95 Z-.025');
    self.currentZDelta2 = self.currentZDelta2 - 0.025;
	};

  self.setZOffset2 = function() {
    sendPrinterCommand('M670 U' + self.currentZDelta2);
    sendPrinterCommand('M500');
    self.currentZDelta2 = 0;
  };

  self.setOffset = function () {
    sendPrinterCommand('M671');
    sendPrinterCommand('G91');
    sendPrinterCommand('G0 Z2');
    sendPrinterCommand('G90');
    sendPrinterCommand('M500');
	};

	self.levelBedHeated = function () {
    self.resetLeveling();
    self.autoCalibrateRun();

    sendPrinterCommand('G91');
    sendPrinterCommand('G0 Z2 F300');
    sendPrinterCommand('G90');
    sendPrinterCommand('M400');
    sendPrinterCommand('G32');
    sendPrinterCommand('M400');
    sendPrinterCommand('G0 Z2 F300');
    sendPrinterCommand('M400');
    sendPrinterCommand('M374');
    sendPrinterCommand('M400');
    sendPrinterCommand('M500');
	};

	self.levelBed = function() {
     self.preheat(0, 1, self.levelBedHeated);
	};

  self.levelBed2 = function() {
     self.preheat(0, 2, self.levelBedHeated);
	};

  self.calibrateDone = function () {
      sendPrinterCommand('M511');
	};

  self.calibrateSensor = function() {
    var messageType = "calibrating";
    var messageData = {message:"", title:""};

    sendPrinterCommand('M510');

    messageData.title = "Calibrating...";
    self.actionTriggerTemplate(messageType);
    self.showActionTriggerDialog(messageData, self.calibrateDone);
  };

  self.calibrateDeflectionDoit = function () {
    sendPrinterCommand('M515');
    sendPrinterCommand('G33');
    sendPrinterCommand('M516');
    sendPrinterCommand('M500');
  }

  self.calibrateDeflection = function() {
    var messageType = "deflecting";
    var messageData = {message:"", title:""};

    messageData.title = "Calibrating Deflection...";
    self.actionTriggerTemplate(messageType);
    self.showActionTriggerDialog(messageData, self.calibrateDeflectionDoit);
  };

/*
  self.homePrintheadHeated = function() {
    sendPrinterCommand('G91');
    sendPrinterCommand('G0 Z5 F300');
    sendPrinterCommand('G90');
    sendPrinterCommand('G28');
    sendPrinterCommand('G0 Z1');
    sendPrinterCommand('G0 X150 Y150 F5000');
    sendPrinterCommand('G30.1 Q');
    sendPrinterCommand('G0 Z0');
    sendPrinterCommand('M516');
  };

  self.homePrinthead = function() {
      self.preheat(0, 1, self.homePrintheadHeated);
  };
*/

	self.resetLeveling = function() {
    sendPrinterCommand('M374.1');
    sendPrinterCommand('M561');
	};

  self.handleFocus = function(event) {
//        var value = self.newTarget();
//        if (value === undefined || (typeof(value) === "string" && value.trim() === "")) {
//            self.newTarget(self.target());
//        }
//        window.setTimeout(function() {
//            event.target.select();
//        }, 0);
  };

  self.newTargetValid = function() {
      var value = self.newTarget();

//      new PNotify({
//        title: 'Pop Up Message',
//        text: 'Target Valid',
//        type: self.msgType(),
//        hide: self.autoClose()
//        });

      try {
          value = parseInt(value);
      } catch (exc) {
          return false;
      }

      return (value >= 0 && value <= 999);
  };


          self.setTargetToValue = function(value) {
//              self.clearAutosendTarget(item);

              try {
                  value = parseInt(value);
              } catch (ex) {
                  return OctoPrintClient.createRejectedDeferred();
              }

              if (value < 0 || value > 999) return OctoPrintClient.createRejectedDeferred();

              var onSuccess = function() {
                  self.target(value);
                  self.newTarget("");
              };

//                  return self._setToolTemperature(item.key(), value)
//                      .done(onSuccess);
          };

  self.setTarget = function(form) {
    var value = self.newTarget();

//    new PNotify({
//      title: 'Set Target',
//      text: value,
//      type: self.msgType(),
//      hide: self.autoClose()
//      });

      if (form !== undefined) {
          $(form).find("input").blur();
      }
      if (value === undefined || (typeof(value) === "string" && value.trim() === "")) return OctoPrintClient.createRejectedDeferred();

//      self.clearAutosendTarget(item);
      return self.setTargetToValue(value);
  };



  self.formatZoffset = function(zoff) {
      if (zoff === undefined || !_.isNumber(zoff)) return "-";
      return _.sprintf("%.2f", zoff);
  };


  self.setZOffsetDirect = function (offsetval) {
    self.preheat1();
    console.log('Loading Z Offset Direct: ' + offsetval);
  };

  self.fromZResponse = function (data) {
              console.log('MSL: got reply5 ' + data);
          };


    self.loadZOffset = function () {
      console.log('Loading Z Offset');

      sendPrinterCommand('M115');
      $.ajax({
          url: API_BASEURL + "plugins/NWTools",
          type: "POST",
          command: "command1",
          dataType: "json",
          success: self.fromZResponse
      });

    };


  self.incrementTarget = function() {
    var value = self.newTarget();

//    new PNotify({
//      title: 'Increment Target0',
//      text: value,
//      type: self.msgType(),
//      hide: self.autoClose()
//      });


      if (value === undefined || (typeof(value) === "string" && value.trim() === "")) {
          value = self.target();
      }

      try {
          value = parseInt(value);
          if (value > 999) return;
          self.newTarget(value + 1);
//          self.autosendTarget(item);
      } catch (ex) {
          // do nothing
      }
  };

  self.decrementTarget = function() {
    var value = self.newTarget();
  };

  //    new PNotify({
  //      title: 'Decrement Target0',
  //      text: value,
  //      type: self.msgType(),
  //      hide: self.autoClose()
  //      });


  self.decrementTarget9 = function() {
      var value = self.newTarget();
      if (value === undefined || (typeof(value) === "string" && value.trim() === "")) {
          value = self.target();
      }
      try {
          value = parseInt(value);
          if (value <= 0) return;
          self.newTarget(value - 1);
//          self.autosendTarget(item);
      } catch (ex) {
          // do nothing
      }
  };


  self.decreaseZOffset1 = function() {

  };

  self.decreaseZOffset2 = function() {

  };


        // This will get called before the HelloWorldViewModel gets bound to the DOM, but after its
        // dependencies have already been initialized. It is especially guaranteed that this method
        // gets called _after_ the settings have been retrieved from the OctoPrint backend and thus
        // the SettingsViewModel been properly populated.
        self.onBeforeBinding = function() {
        }

        self.onEventConnected = function(payload) {
          self.loadZOffset();
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
        ["settingsViewModel", "controlViewModel", "systemViewModel", "loginStateViewModel", "printerProfilesViewModel"],

        // Finally, this is the list of selectors for all elements we want this view model to be bound to.
        ["#tab_plugin_NWTools"]
    ]);
});
