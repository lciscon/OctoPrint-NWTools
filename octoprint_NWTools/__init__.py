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

import logging
import os
import subprocess

from octoprint.server import admin_permission


class Prompt(object):

	def __init__(self, text):
		self.text = text
		self.choices = []

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
		)

	def on_api_get(self, request):
		return None

	def on_api_command(self, command, data):
		if command == "firmware_exists":
			self._logger.info("Checking for firmware file")
			return jsonify(dict(exists=str(self._check_for_firmware())))

		elif command == "update_firmware":
			self._logger.info("Updating Firmware")
			return jsonify(dict(success=str(self._update_firmware())))

		elif command == "get_leveling":
			self._logger.info("Getting leveling data")
			return jsonify(dict(levels=str(self._bedlevels())))

	def _check_for_firmware(self):
		r = self._exec_cmd("checkfirm")
		return r

	def _update_firmware(self):
		r = self._exec_cmd("updatefirm")
		return r

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
		if not action.startswith(b"prompt_"):
			return

		parts = action.split(None, 1)
		if len(parts) == 1:
			action = parts[0]
			parameter = ""
		else:
			action, parameter = parts

		if action == "error":
			self._plugin_manager.send_plugin_message(self._identifier, dict(action="show", text=self._prompt.text, choices=self._prompt.choices))

			if self._prompt is None:
				return
			if self._prompt.active:
				self._logger.warn("Prompt is already active")
				return
			self._show_prompt()

	## this is the responses received from the printer
	## we need to scan this for anything relevant to us
	def processResponse(self, comm, line, *args, **kwargs):
		self._logger.info("Processings2: %s" % line)

		if "Leveling:" in line:
			# The line should look like this:
			# Leveling: 2.51 3.52 0.1
			llist = line.split(" ")
			this._bedlevels[0] = float(llist[1])
			this._bedlevels[1] = float(llist[2])
			this._bedlevels[2] = float(llist[3])

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


# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "Northworks Tools"
__plugin_implementation__ = NwtoolsPlugin()

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
