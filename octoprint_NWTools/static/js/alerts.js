if (!document.getElementById("sweetalert2-styling")) {
  let link = document.createElement("link");
  link.id = "sweetalert2-styling";
  link.href = "https://cdnjs.cloudflare.com/ajax/libs/limonte-sweetalert2/7.29.0/sweetalert2.min.css";
  link.rel = "stylesheet";
  document.head.appendChild(link);
}

if (!document.getElementById("sweetalert2-script")) {
  let script = document.createElement("script");
  script.id = "sweetalert2-script";
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/limonte-sweetalert2/7.29.0/sweetalert2.min.js";
  document.head.appendChild(script);
}

const NWToolsAlerts = {
  probeTestAlert: () => {
    return swal({
      title: "Notice",
      text:
        "Running probe test. Make sure the bed is clear.",
      confirmButtonText: "Proceed",
      showCancelButton: true,
	  cancelButtonText: "Cancel",
      reverseButtons: false,
      type: "info"
    });
  },
  preheatAlert: () => {
    return swal({
      title: "Notice",
      text:
        "Preheating...",
	  confirmButtonText: "Proceed",
      showCancelButton: true,
  	  cancelButtonText: "Cancel",
      reverseButtons: false,
      type: "info"
    });
  },
  rebootAlert: () => {
    return swal({
      title: "Notice",
      text:
        "Rebooting Controller...",
	  confirmButtonText: "Ok",
      type: "info"
    });
  },
  firmStartAlert: () => {
    return swal({
      title: "Notice",
      text:
        "Updating Firmware...",
	  confirmButtonText: "Ok",
      type: "info"
    });
  },
  firmErrorAlert: () => {
    return swal({
      title: "Error",
      text:
        "No firmware file found. Please upload firmware.bin first.",
	  confirmButtonText: "Ok",
      type: "error"
    });
  },
  loadFilamentAlert: () => {
    return swal({
      title: "Notice",
      text:
        "Press OK once filament starts extruding from the nozzle.",
	  confirmButtonText: "Ok",
      type: "info"
    });
  },
  unloadFilamentAlert: () => {
    return swal({
      title: "Notice",
      text:
        "Press OK once filament has finished unloading.",
	  confirmButtonText: "Ok",
      type: "info"
    });
  },
  firmDoneAlert: () => {
    return swal({
      title: "Notice",
      text:
        "Firmware updated!",
	  confirmButtonText: "Ok",
      type: "info"
    });
  },
  levelBedAlert: () => {
    return swal({
      title: "Notice",
      text:
        "Leveling Bed...",
	  confirmButtonText: "Ok",
      type: "info"
    });
  },
  calibratingAlert: () => {
    return swal({
      title: "Notice",
      text:
        "Calibrating...",
	  confirmButtonText: "Ok",
      type: "info"
    });
  },
  errorAlert: errorNumber => {
	return swal({
	  title: `Error ${errorNumber} detected`,
	  text: `An error occurred on your printer.`,
	  type: "error"
	});
  },
  noticeAlert: message => {
	return swal({
	  title: `Notice`,
	  text: message,
	  type: "info"
	});
  },
  resetDefaultAlert: () => {
    return swal({
      title: "Warning",
      text:
        "This will reset the settings to the defaults.",
      confirmButtonText: "Proceed",
      showCancelButton: true,
	  cancelButtonText: "Cancel",
      reverseButtons: false,
      type: "info"
    });
  },
  alertVisible: () => {
	return(Swal.isVisible());
  },
  closeAlert: () => {
	if (Swal.isVisible()) {
	  Swal.close();
	}
  },
};
