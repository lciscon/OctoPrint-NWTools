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
  preheatAlert: () => {
    return swal({
      title: "Pre-heat your printer",
      text:
        "Palette 2 is now making filament. In the meantime, please pre-heat your printer using the controls in the Temperature Tab.",
      type: "info"
    });
  },
};
