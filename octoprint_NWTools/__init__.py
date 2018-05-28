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
import flask
import re

class NwtoolsPlugin(octoprint.plugin.SettingsPlugin,
                   octoprint.plugin.StartupPlugin,
                   octoprint.plugin.TemplatePlugin,
		   octoprint.plugin.AssetPlugin,
		   octoprint.printer.PrinterInterface):

	def on_after_startup(self):
    		self._logger.info("Hello World! (more: %s)" % self._settings.get(["zOffset2"]))

	def get_settings_defaults(self):
		return dict(zOffset2="3.14")

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
#		if "Offset" not in line:
		if "Marlin" not in line:
			return line

		self._logger.info("Processings2: %s" % line)
		self._logger.info("Sending message to: %s" % self._identifier)

#        self._settings.set(["zOffset2", "999"], None)

#    	self._logger.info("Hello World2! (more: %s)" % self._settings.get(["zOffset2"]))

		self._plugin_manager.send_plugin_message(self._identifier, dict(zoffset=line))

		return line

	def AlertM117(self, comm_instance, phase, cmd, cmd_type, gcode, *args, **kwargs):
		if gcode and cmd.startswith("M117"):
			self._plugin_manager.send_plugin_message(self._identifier, dict(type="popup", msg=re.sub(r'^M117\s?', '', cmd)))
			return



# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "Tools"
__plugin_implementation__ = NwtoolsPlugin()

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = NwtoolsPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
		"octoprint.comm.protocol.gcode.received": __plugin_implementation__.processGCODE,
		"octoprint.comm.protocol.gcode.queuing": __plugin_implementation__.AlertM117

	}
