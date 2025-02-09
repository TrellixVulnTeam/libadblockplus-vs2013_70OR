/*
 * This file is part of Adblock Plus <https://adblockplus.org/>,
 * Copyright (C) 2006-2015 Eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

//
// The values are hardcoded for now.
//

let defaults = {
  __proto__: null,
  enabled: true,
  patternsfile: "patterns.ini",
  patternsbackups: 5,
  patternsbackupinterval: 24,
  data_directory: "",
  savestats: false,
  privateBrowsing: false,
  subscriptions_fallbackerrors: 5,
  subscriptions_fallbackurl: "https://adblockplus.org/getSubscription?version=%VERSION%&url=%SUBSCRIPTION%&downloadURL=%URL%&error=%ERROR%&channelStatus=%CHANNELSTATUS%&responseStatus=%RESPONSESTATUS%",
  subscriptions_autoupdate: true,
  subscriptions_exceptionsurl: "https://easylist-downloads.adblockplus.org/exceptionrules.txt",
  documentation_link: "https://adblockplus.org/redirect?link=%LINK%&lang=%LANG%",
  update_url_release: "https://update.adblockplus.org/%NAME%/update.json?type=%TYPE%",
  update_url_devbuild: "https://adblockplus.org/devbuilds/%NAME%/update.json?type=%TYPE%",
  update_last_check: 0,
  update_last_error: 0,
  update_soft_expiration: 0,
  update_hard_expiration: 0,
  currentVersion: "0.0",
  notificationdata: {},
  notificationurl: "https://notification.adblockplus.org/notification.json",
  suppress_first_run_page: false,
  disable_auto_updates: false,
  notifications_ignoredcategories: [],
};

let preconfigurable = ["suppress_first_run_page", "disable_auto_updates"];

let values;
let path = _fileSystem.resolve("prefs.json");
let listeners = [];
let isDirty = false;
let isSaving = false;

function defineProperty(key)
{
  Object.defineProperty(Prefs, key,
  {
    get: () => values[key],
    set: function(value)
    {
      if (typeof value != typeof defaults[key])
        throw new Error("Attempt to change preference type");

      if (value == defaults[key])
        delete values[key];
      else
        values[key] = value;
      save();

      for (let listener of listeners)
        listener(key);
    },
    enumerable: true
  });
}

function load()
{
  _fileSystem.read(path, function(result)
  {
    // prefs.json is expected to be missing, ignore errors reading file
    if (!result.error)
    {
      try
      {
        let data = JSON.parse(result.content);
        for (let key in data)
          if (key in defaults)
            values[key] = data[key];
      }
      catch (e)
      {
        Cu.reportError(e);
      }
    }

    if (typeof Prefs._initListener == "function")
      Prefs._initListener();
  });
}

function save()
{
  if (isSaving)
  {
    isDirty = true;
    return;
  }

  isDirty = false;
  isSaving = true;
  _fileSystem.write(path, JSON.stringify(values), function()
  {
    isSaving = false;
    if (isDirty)
      save();
  });
}

let Prefs = exports.Prefs = {
  addListener: function(listener)
  {
    if (listeners.indexOf(listener) < 0)
      listeners.push(listener);
  },

  removeListener: function(listener)
  {
    let index = listeners.indexOf(listener);
    if (index >= 0)
      listeners.splice(index, 1);
  },
};

// Update the default prefs with what was preconfigured
for (let key in _preconfiguredPrefs)
  if (preconfigurable.indexOf(key) != -1)
    defaults[key] = _preconfiguredPrefs[key];

// Define defaults
for (let key in defaults)
  defineProperty(key);

// Set values of prefs based on defaults
values = Object.create(defaults);

load();
