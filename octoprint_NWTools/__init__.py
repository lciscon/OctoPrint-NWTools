# coding=utf-8
from __future__ import absolute_import

__author__ = "Larry Ciscon <lciscon@gmail.com>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'
__copyright__ = "Copyright (C) 2020 Northworks Automation, Inc. - Released under terms of the AGPLv3 License"

import octoprint.plugin
from flask import jsonify, make_response

import octoprint.printer
import flask
import re
import time

import logging
import os
import subprocess

from octoprint.server import admin_permission


class Prompt(object):

	def __init__(self, text):
		self.text = text
		self.choices = []
		self._tool0_ZOffset = 0.0
		self._tool1_ZOffset = 0.0
		self._active = False

	@property
	def active(self):
		return self._active

	def add_choice(self, text):
		self.choices.append(text)

	def activate(self):
		self._active = True

	def validate_choice(self, choice):
		return 0 <= choice < len(self.choices)


class NwtoolsPlugin(octoprint.plugin.SettingsPlugin,
					octoprint.plugin.StartupPlugin,
					octoprint.plugin.TemplatePlugin,
					octoprint.plugin.AssetPlugin,
					octoprint.printer.PrinterInterface,
					octoprint.plugin.SimpleApiPlugin):

	def __init__(self):
		self._bedlevels = [0.0]*3

##	def on_after_startup(self):
##    		self._logger.info("Hello World! (more: %s)" % self._settings.get(["zOffset2"]))

	@property
	def bedlevels(self):
		return self._bedlevels

	def get_settings_defaults(self):
		return dict(zOffset2="3.14")

	def get_template_vars(self):
            return dict(url=self._settings.get(["url"]))

	def get_template_configs(self):
    		return [
   		     dict(type="tab", name="Tools", template="NWTools_tab.jinja2", custom_bindings=True),
   		     dict(type="tab", name="Calibrate", template="NWCalibrate_tab.jinja2", custom_bindings=True)
    		]

	##~~ SimpleApiPlugin API

	def get_api_commands(self):
		return dict(
			firmware_exists=[],
			update_firmware=[],
			get_leveling=[],
			reboot_controller=[],
			lights_on=[],
			lights_off=[],
			cabinet_on=[],
			cabinet_off=[],
			fixgrid=[],
			mountctl=[],
			umountctl=[],
			show_notice=[],
			close_notice=[],
		)

	def on_api_get(self, request):
		return None

	def on_api_command(self, command, data):
		if command == "firmware_exists":
			retval = self._exec_cmd("checkfirm")
#			retval = self._check_for_firmware()
			if (retval is None) :
				self._logger.info("Firmware file not found! ")
				return jsonify(dict(file_exists=str(0)))
			else:
				self._logger.info("Checking for firmware file returns " + str(retval))
				return jsonify(dict(file_exists=str(retval)))

		elif command == "update_firmware":
			self._logger.info("Updating Firmware")
			r = self._exec_cmd("updatefirm")
			return jsonify(dict(success=str(r)))
#			return jsonify(dict(success=str(self._update_firmware())))

		elif command == "get_leveling":
			self._logger.info("Getting leveling data")
			return jsonify(dict(levels=self._bedlevels))

		elif command == "reboot_controller":			
			self._exec_cmd("machine restart")
			time.sleep(3)
			return jsonify(dict(success="true"))

		elif command == "show_notice":
			self._plugin_manager.send_plugin_message(self._identifier, dict(action="notice", text=data["message"]))

		elif command == "close_notice":
			self._plugin_manager.send_plugin_message(self._identifier, dict(action="closenotice"))

		elif command == "lights_on":
			self._exec_cmd("lights on")

		elif command == "lights_off":
			self._exec_cmd("lights off")

		elif command == "cabinet_on":
			self._exec_cmd("cabinet on")

		elif command == "cabinet_off":
			self._exec_cmd("cabinet off")

		elif command == "mountctl":
			self._exec_cmd("mountctl")

		elif command == "umountctl":
			self._exec_cmd("umountctl")

		elif command == "fixgrid":
			self._exec_cmd("fixgrid")
			self._plugin_manager.send_plugin_message(self._identifier, dict(action="gridfixed"))

#	def _check_for_firmware(self):
#		r = self._exec_cmd("checkfirm")
#		return r

#	def _update_firmware(self):
#		r = self._exec_cmd("updatefirm")
#		return r

	##~~ AssetPlugin mixin

	def get_assets(self):
		# Define your plugin's asset files to automatically include in the
		# core UI here.
		return dict(
			js=["js/NWTools.js", "js/alerts.js"],
			css=["css/NWTools.css"],
			less=["less/NWTools.less"]
		)

	##~~ Softwareupdate hook

	def get_version(self):
		return self._plugin_version

	def get_update_information(self):
		# Define the configuration for your plugin to use with the Software Update
		# Plugin here. See https://github.com/foosel/OctoPrint/wiki/Plugin:-Software-Update
		# for details.
		return dict(
			nwtools=dict(
				displayName="Northworks Tools",
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

	def action_command_handler(self, comm, line, action, *args, **kwargs):
##		if not action.startswith(b"prompt_"):
##			return

		parts = action.split(None, 1)
		if len(parts) == 1:
			action = parts[0]
			parameter = ""
		else:
			action, parameter = parts

		if action == "error" or action == "gridsaved" or action == "gridfixed" or action == "gridcomplete" or action == "levelcomplete" or action == "probecomplete":
			self._plugin_manager.send_plugin_message(self._identifier, dict(action=action, text=parameter))
			return
		else:
			if not action.startswith(b"prompt_"):
				return

			if self._prompt is None:
				return
			if self._prompt.active:
				self._logger.warn("Prompt is already active")
				return
			self._show_prompt()

	def findListVal(self, llist, key):
		for i in llist:
#			self._logger.info("Processings3: %s in %s" % (key, i))
			if (i.startswith(key)):
				val = i[1:]
#				self._logger.info("Returning: %s" % val)
				return(val)

		return("")


	## this is the responses received from the printer
	## we need to scan this for anything relevant to us
	def processResponse(self, comm, line, *args, **kwargs):
#		self._logger.info("Processings2: %s" % line)

		if line.startswith("Leveling"):
			# The line should look like this:
			# Leveling: 2.51 3.52 0.1
			llist = line.split(" ")
			self._bedlevels[0] = float(llist[1])
			self._bedlevels[1] = float(llist[2])
			self._bedlevels[2] = float(llist[3])
		elif "M670" in line:
			# M670 S0.50 K100.00 R0.00 Z30.00 H3.00 D0.00 O-0.2000 Q-0.3500
			self._logger.info("Found M670!")
			llist = line.split(" ")
			self._tool0_ZOffset = float(self.findListVal(llist, 'O'))
			self._tool1_ZOffset = float(self.findListVal(llist, 'Q'))

			self._plugin_manager.send_plugin_message(self._identifier, dict(action="update", tool0_ZOffset=self._tool0_ZOffset, tool1_ZOffset=self._tool1_ZOffset))

		elif "M673" in line:
			self._logger.info("Found M673!")
			llist = line.split(" ")
			self._tool0_Raised = float(self.findListVal(llist, 'A'))
			self._tool0_Locked = float(self.findListVal(llist, 'B'))
			self._tool1_Raised = float(self.findListVal(llist, 'C'))
			self._tool1_Locked = float(self.findListVal(llist, 'D'))

			self._plugin_manager.send_plugin_message(self._identifier, dict(action="update", tool0_Raised=self._tool0_Raised, tool0_Locked=self._tool0_Locked, tool1_Raised=self._tool1_Raised, tool1_Locked=self._tool1_Locked))

		elif "M675" in line:
			self._logger.info("Found M675!")
			llist = line.split(" ")
			self._tool1_XOffset = float(self.findListVal(llist, 'X'))
			self._tool1_YOffset = float(self.findListVal(llist, 'Y'))

			self._plugin_manager.send_plugin_message(self._identifier, dict(action="update", tool1_XOffset=self._tool1_XOffset, tool1_YOffset=self._tool1_YOffset))

		return line



	## this is the gcode being queued up to send to the printer
	def processQueueing(self, comm_instance, phase, cmd, cmd_type, gcode, *args, **kwargs):
##		if gcode and cmd.startswith("M117"):
##			self._plugin_manager.send_plugin_message(self._identifier, dict(type="popup", msg=re.sub(r'^M117\s?', '', cmd)))
		return

	def _show_prompt(self):
		if self._enable == "never" or (self._enable == "detected" and not self._cap_prompt_support):
			return

		self._prompt.activate()
		self._plugin_manager.send_plugin_message(self._identifier, dict(action="show",
		                                                                text=self._prompt.text,
		                                                                choices=self._prompt.choices))

	def _close_prompt(self):
		if self._enable == "never" or (self._enable == "detected" and not self._cap_prompt_support):
			return

		self._prompt = None
		self._plugin_manager.send_plugin_message(self._identifier, dict(action="close"))

	def _exec_cmd(self, cmd_line):
		self._logger.debug("Executing command: %s" % (cmd_line))
		try:
#			r = os.system(cmd_line)
#			Python 3
#			process = subprocess.run(cmd_line, check=True, stdout=subprocess.PIPE, universal_newlines=True)
#			r = process.stdout
#			Python 2
#			r = subprocess.check_output(cmd_line).decode()
			r = subprocess.check_output(cmd_line, shell=True).decode()
		except Exception as e:
			output = "Error while executing command: {}" + str(e)
			self._logger.warn(output)
			return None

#		self._logger.info("Command %s returned: %s" % (cmd_line, r))
		return(r)



# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "Northworks Tools"
__plugin_implementation__ = NwtoolsPlugin()
__plugin_pythoncompat__ = ">=2.7,<4"

def __plugin_check__():
    return True

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = NwtoolsPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
    	"octoprint.comm.protocol.action": __plugin_implementation__.action_command_handler,
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
		"octoprint.comm.protocol.gcode.received": __plugin_implementation__.processResponse,
		"octoprint.comm.protocol.gcode.queuing": __plugin_implementation__.processQueueing,
	}
