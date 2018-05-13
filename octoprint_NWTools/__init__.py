# coding=utf-8
from __future__ import absolute_import

### (Don't forget to remove me)
# This is a basic skeleton for your plugin's __init__.py. You probably want to adjust the class name of your plugin
# as well as the plugin mixins it's subclassing from. This is really just a basic skeleton to get you started,
# defining your plugin as a template plugin, settings and asset plugin. Feel free to add or remove mixins
# as necessary.
#
# Take a look at the documentation on what other plugin mixins are available.

import octoprint.plugin
import octoprint.printer
import octoprint.logging

class NwtoolsPlugin(octoprint.plugin.SettingsPlugin,
                   octoprint.plugin.StartupPlugin,
                   octoprint.plugin.TemplatePlugin,
		   octoprint.plugin.AssetPlugin,
		   octoprint.printer.PrinterInterface):

	def on_after_startup(self):
    		self._logger.info("Hello World! (more: %s)" % self._settings.get(["url"]))

	def get_settings_defaults(self):
		return dict(url="https://en.wikipedia.org/wiki/Hello_world")

	def get_template_configs(self):
    		return [
   		     dict(type="navbar", custom_bindings=False),
 		     dict(type="settings", custom_bindings=False)
    		]

	##~~ AssetPlugin mixin

	def get_assets(self):
		# Define your plugin's asset files to automatically include in the
		# core UI here.
		return dict(
			js=["js/NWTools.js"],
			css=["css/NWTools.css"],
			less=["less/NWTools.less"]
		)

	##~~ Softwareupdate hook

	def get_update_information(self):
		# Define the configuration for your plugin to use with the Software Update
		# Plugin here. See https://github.com/foosel/OctoPrint/wiki/Plugin:-Software-Update
		# for details.
		return dict(
			nwtools=dict(
				displayName="NWTools",
				displayVersion=self._plugin_version,

				# version check: github repository
				type="github_release",
				user="lciscon",
				repo="OctoPrint-NWTools",
				current=self._plugin_version,

				# update method: pip
				pip="https://github.com/lciscon/OctoPrint-NWTools/archive/{target_version}.zip"
			)
		)

	def processGCODE(self, comm, line, *args, **kwargs):
		if self.processing and "ok" not in line and re.match(r"^((\d+\s)|(\|\s+)|(\[?\s?\+?\-?\d?\.\d+\]?\s*\,?)|(\s?\.\s*)|(NAN\,?))+$", line.strip()):
			# new_line = re.sub(r"(\[ ?)+","",line.strip())
			# new_line = re.sub(r"[\]NA\)\(]","",new_line)
			# new_line = re.sub(r"( +)|\,","\t",new_line)
			# new_line = re.sub(r"(\.\t)","\t",new_line)
			# new_line = re.sub(r"\.$","",new_line)
			# new_line = new_line.split("\t")

			new_line = re.findall(r"(\+?\-?\d*\.\d*)",line)

			if self._settings.get(["stripFirst"]):
				new_line.pop(0)
			if len(new_line) > 0:
				if self._settings.get(["flipX"]):
					new_line.reverse()
				self.mesh.append(new_line)
			return line

		if self.processing and "Home XYZ first" in line:
			self._plugin_manager.send_plugin_message(self._identifier, dict(error=line.strip()))
			self.processing = False
			return line

		if self.processing and "ok" in line and len(self.mesh) > 0:
			octoprint_printer_profile = self._printer_profile_manager.get_current()
			volume = octoprint_printer_profile["volume"]
			custom_box = volume["custom_box"]
			# see if we have a custom bounding box
			if custom_box:
				min_x = custom_box["x_min"]
				max_x = custom_box["x_max"]
				min_y = custom_box["y_min"]
				max_y = custom_box["y_max"]
				min_z = custom_box["z_min"]
				max_z = custom_box["z_max"]
			else:
				min_x = 0
				max_x = volume["width"]
				min_y = 0
				max_y = volume["depth"]
				min_z = 0
				max_z = volume["height"]
			bed_type = octoprint_printer_profile["volume"]["formFactor"]

			bed = dict(type=bed_type,x_min=min_x,x_max=max_x,y_min=min_y,y_max=max_y,z_min=min_z,z_max=max_z)

			self.processing = False
			if self._settings.get(["flipY"]):
				self.mesh.reverse()
			self._plugin_manager.send_plugin_message(self._identifier, dict(mesh=self.mesh,bed=bed))
		
		return line


#	def detect_machine_type(comm, line, *args, **kwargs):
#        return line


# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "Tools"
__plugin_implementation__ = NwtoolsPlugin()

def detect_machine_type(comm, line, *args, **kwargs):
    return line


def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = NwtoolsPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
		"octoprint.comm.protocol.gcode.received": __plugin_implementation__.processGCODE
	}
