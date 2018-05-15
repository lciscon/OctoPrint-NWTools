$(function() {

    import logging

    function NWToolsViewModel(parameters) {
      var self = this;

      self.settings = parameters[0];
      self.control = parameters[1];

	    self.targetTemp = 0;
	    self.currentTemp = 0;

      self.autoCalibrating = 0;

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
	};


	self.fromResponse = function (data) {
            console.log('MSL: got reply2 ' + data.tool0.actual);
	    self.currentTemp = parseFloat(data.tool0.actual);
        };

	self.requestData = function() {
            $.ajax({
                url: API_BASEURL + "printer/tool",
                type: "GET",
                dataType: "json",
                success: self.fromResponse
            });
        };


	function sendPrinterCommand (cmdstr) {
	   console.log('MSL: sending cmd: '+cmdstr);
           self.control.sendCustomCommand({ command: cmdstr });
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

	    if (self.currentTemp < self.targetTemp) {
                    setTimeout(self.tempTimer, 1000);
            } else {
                    console.log('Finished heatup! ');
		    self.hideActionTriggerDialog();
		    if (self.tempCallback) {
		    	self.tempCallback();
		    }
            }
        };


	self.preheat = function (toolnumber, callback) {
        	var messageType = "preheating";
        	var messageData = {message:"", title:""};

		      self.tempCallback = callback;
        	messageData.title = "Preheating...";
        	self.actionTriggerTemplate(messageType);
        	self.showActionTriggerDialog(messageData, null);

        	//begin hotend preheat
           	sendPrinterCommand('M42');
        	sendPrinterCommand('T' + toolnumber);
        	sendPrinterCommand('M109 S220');
		      self.targetTemp = 220;
		      self.tempCallback = callback;
		      self.tempTimer();
   	};

    	self.preheat1 = function(callback) {
	    	self.preheat(0,callback);
    	};

	self.preheat2 = function(callback) {
	    	self.preheat(1,callback);
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
	    self.preheat(toolnumber, self.loadFilamentPreheated);
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
	    self.preheat(toolnumber, self.unloadFilamentPreheated);
	};

        self.unloadFilament1 = function() {
            self.unloadFilament(0);
        };

        self.unloadFilament2 = function() {
            self.unloadFilament(1);
        };

	self.lightsOn = function() {
	    sendPrinterCommand('M5');
	};

	self.lightsOff = function() {
            sendPrinterCommand('M3');
	};

	self.unloadPrint = function() {
            sendPrinterCommand('G0 Z250');
	};

	self.autoCalibrateHeated = function () {
      sendPrinterCommand('M400');
      sendPrinterCommand('G91');
      sendPrinterCommand('G0 Z5 F300');
      sendPrinterCommand('G90');
      sendPrinterCommand('G28');
      sendPrinterCommand('G0 Z1');
      sendPrinterCommand('G0 X0 Y0  F5000');
      sendPrinterCommand('M400');
      sendPrinterCommand('M515');
      sendPrinterCommand('G30 Z0');
      sendPrinterCommand('G0 Z0.5 F300');
      sendPrinterCommand('G91');
	};

  self.fromZResponse = function (data) {
            console.log('MSL: got reply2 ' + data.tool0.actual);
	    self.currentTemp = parseFloat(data.tool0.actual);
        };


  self.loadZOffset() {
    console.log('Loading Z Offset');

    //query the printer for the current Z Offset
    sendPrinterCommand('M505');
//    console.log('Loading Z Offset: ' + z_offset_data[1]);
//    return z_offset_data[1];
    $.ajax({
        url: API_BASEURL + "plugins/NWTools",
        type: "POST",
        command: "command1",
        dataType: "json",
        success: self.fromZResponse
    });

  };

  self.setZOffset() {
    sendPrinterCommand('M670 O' + );
    console.log('Loading Z Offset: ' + z_offset_data[1]);
    return z_offset_data[1];
  };

  self.increaseZOffset1() {

  };

  self.increaseZOffset2() {

  };

  self.decreaseZOffset1() {

  };

  self.decreaseZOffset2() {

  };

	self.autoCalibrate = function() {
	    self.preheat(0, self.autoCalibrateHeated);
	};

  self.moveUp = function() {
//    sendPrinterCommand('G91');
    sendPrinterCommand('G1 Z-.025 F100');
//    sendPrinterCommand('G90');
	};

  self.moveDown = function() {
//    sendPrinterCommand('G91');
    sendPrinterCommand('G1 Z.025 F100');
//    sendPrinterCommand('G90');
	};

  self.setOffset = function () {
    sendPrinterCommand('M671');
    sendPrinterCommand('G91');
    sendPrinterCommand('G0 Z2');
    sendPrinterCommand('G90');
    sendPrinterCommand('M516');
    sendPrinterCommand('M500');
	};


	self.levelBedHeated = function () {
    sendPrinterCommand('M400');
    sendPrinterCommand('G91');
    sendPrinterCommand('G0 Z5 F300');
    sendPrinterCommand('G90');
    sendPrinterCommand('G28');
    sendPrinterCommand('M400');
    sendPrinterCommand('G0 Z1');
    sendPrinterCommand('G0 X0 Y0 F5000');
    sendPrinterCommand('M400');
    sendPrinterCommand('G30 Q');
    sendPrinterCommand('G0 Z2 F300');
    sendPrinterCommand('M400');
    sendPrinterCommand('G32');
    sendPrinterCommand('M516');
    sendPrinterCommand('M500');
	};

	self.levelBed = function() {
     self.preheat(0, self.levelBedHeated);
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


  self.homePrintheadHeated = function() {
    sendPrinterCommand('G91');
    sendPrinterCommand('G0 Z5 F300');
    sendPrinterCommand('G90');
    sendPrinterCommand('G28');
    sendPrinterCommand('G0 Z1');
    sendPrinterCommand('G0 X0 Y0 F5000');
    sendPrinterCommand('G30 Q');
    sendPrinterCommand('G0 Z0');
    sendPrinterCommand('M516');
  };

  self.homePrinthead = function() {
      self.preheat(0, self.homePrintheadHeated);
  };


	self.resetLeveling = function() {
    sendPrinterCommand('M561');
	};




        // This will get called before the HelloWorldViewModel gets bound to the DOM, but after its
        // dependencies have already been initialized. It is especially guaranteed that this method
        // gets called _after_ the settings have been retrieved from the OctoPrint backend and thus
        // the SettingsViewModel been properly populated.
        self.onBeforeBinding = function() {
        };

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
        ["settingsViewModel", "controlViewModel"],

        // Finally, this is the list of selectors for all elements we want this view model to be bound to.
        ["#tab_plugin_NWTools"]
    ]);
});
