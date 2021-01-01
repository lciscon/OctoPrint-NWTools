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
  errorAlert: errorNumber => {
	return swal({
	  title: `Error ${errorNumber} detected`,
	  text: `An error occurred on your printer.`,
	  type: "error"
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
  closeAlert: () => {
	if (Swal.isVisible()) {
	  Swal.close();
	}
  },
};
