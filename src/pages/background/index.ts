import reloadOnUpdate from 'virtual:reload-on-update-in-background-script';
import 'webextension-polyfill';
import { secondsToText, getHostnameFromTab, getUsageByDay } from '@root/utils';
import {
  DATA_KEY,
  UPDATE_SECONDS_INTERVAL_MS,
  LAST_INTERVAL_DATE_KEY,
  PREV_DATE_KEY,
  SLEEP_INTERVAL_MS,
} from '@root/utils/constants';
import { Hostnames, Settings } from 'extension';

reloadOnUpdate('pages/background');

const lastIntervalDate = {
  set: async (date: Date) => {
    await chrome.storage.local.set({ [LAST_INTERVAL_DATE_KEY]: date.toISOString() });
  },
  get: async () => {
    return chrome.storage.local.get([LAST_INTERVAL_DATE_KEY]).then(items => {
      const value = items[LAST_INTERVAL_DATE_KEY];
      if (value) {
        return new Date(value);
      }
      return new Date();
    });
  },
};

const prevDate = {
  set: async (date: Date) => {
    await chrome.storage.local.set({ [PREV_DATE_KEY]: date.toISOString() });
  },
  get: async () => {
    return chrome.storage.local.get([PREV_DATE_KEY]).then(items => {
      const value = items[PREV_DATE_KEY];
      if (value) {
        return new Date(value);
      }
      return new Date();
    });
  },
};

const data = {
  init: async (hostnames: Hostnames) => {
    await data.updateBadgeSecondsToday(hostnames);
  },
  updateBadgeSecondsToday: async (hostnames: Hostnames) => {
    const todayDateKey = new Date().toLocaleDateString('en-CA');
    const usageByDay = getUsageByDay(hostnames);
    console.log('Usage By Day', usageByDay);
    Object.keys(usageByDay).forEach(hostname => {
      hostnames[hostname].badgeSeconds = usageByDay[hostname][todayDateKey]
        ? Math.round(usageByDay[hostname][todayDateKey])
        : 0;
    });
  },
  get: async (): Promise<Hostnames> => {
    return chrome.storage.local.get([DATA_KEY]).then(items => {
      return items[DATA_KEY] ? JSON.parse(items[DATA_KEY]) : {};
    });
  },
  set: async (hostnames: Hostnames) => {
    return chrome.storage.local.set({ [DATA_KEY]: JSON.stringify(hostnames) });
  },
  hostname: {
    getSecondsToday: (hostname: string, hostnames: Hostnames) => {
      const todayDateKey = new Date().toLocaleDateString('en-CA');
      const usageByDay = getUsageByDay(hostnames);
      return usageByDay[hostname] && usageByDay[hostname][todayDateKey]
        ? Math.round(usageByDay[hostname][todayDateKey])
        : 0;
    },
    exists: (hostname: string, hostnames: Hostnames) => {
      return hostnames[hostname] !== undefined;
    },
    create: (hostname: string, hostnames: Hostnames) => {
      if (!hostnames[hostname]) {
        hostnames[hostname] = {
          sessions: [],
          badgeSeconds: 0,
          isActive: false,
          favIconUrl: '',
        };
      }
    },
    setFavIconUrl: (hostname: string, favIconUrl: string, hostnames: Hostnames) => {
      if (hostnames[hostname] && !hostnames[hostname].favIconUrl && favIconUrl) {
        hostnames[hostname].favIconUrl = favIconUrl;
      }
    },
    isActive: (hostname: string, hostnames: Hostnames) => {
      return hostnames[hostname].isActive;
    },
    setActive: (hostname: string, hostnames: Hostnames) => {
      hostnames[hostname].isActive = true;
    },
    setInactive: (hostname: string, hostnames: Hostnames) => {
      hostnames[hostname].isActive = false;
    },
    badgeSeconds: {
      set: (hostname: string, seconds: number, hostnames: Hostnames) => {
        hostnames[hostname].badgeSeconds = seconds;
      },
      increment: (hostname: string, hostnames: Hostnames) => {
        data.hostname.badgeSeconds.set(hostname, hostnames[hostname].badgeSeconds + 1, hostnames);
      },
    },
    session: {
      start: (hostname: string, tab: chrome.tabs.Tab, hostnames: Hostnames) => {
        if (hostnames[hostname].sessions.length === 0 || !data.hostname.session.hasActive(hostname, hostnames)) {
          hostnames[hostname].sessions.push({
            start: new Date().toISOString(),
            end: null,
            name: tab.title,
            url: tab.url,
          });
        }
        data.hostname.setActive(hostname, hostnames);
      },
      end: (hostname: string, lastIntervalDate: Date, hostnames: Hostnames) => {
        const lastSession = hostnames[hostname].sessions[hostnames[hostname].sessions.length - 1];
        if (!lastSession.end) {
          lastSession.end = lastIntervalDate.toISOString();
        }
        data.hostname.setInactive(hostname, hostnames);
      },
      endAll: (options: { excludeHostnames?: string[] }, lastIntervalDate: Date, hostnames: Hostnames) => {
        const { excludeHostnames = [] } = options;

        for (const hostname in hostnames) {
          if (!excludeHostnames.includes(hostname)) {
            data.hostname.session.end(hostname, lastIntervalDate, hostnames);
          }
        }
      },
      hasActive: (hostname: string, hostnames: Hostnames) => {
        const sessions = hostnames[hostname].sessions;
        return sessions.length > 0 && sessions[sessions.length - 1].end === null;
      },
    },
  },
};

const badge = {
  setSeconds: (seconds: number, tabId: chrome.tabs.Tab['id']) => {
    if (seconds >= 60) {
      chrome.action.setBadgeText({ text: secondsToText(seconds), tabId: tabId });
    }
  },
  setActive: () => {},
  setInactive: () => {},
};

setInterval(async () => {
  const hostnames = await data.get();
  const lastIntervalDateValue = await lastIntervalDate.get();
  const date = await prevDate.get();
  if (date.toLocaleDateString('en-CA') !== new Date().toLocaleDateString('en-CA')) {
    await data.updateBadgeSecondsToday(hostnames);
    await prevDate.set(new Date());
    await data.set(hostnames);
  }
  await chrome.windows
    .getLastFocused({ populate: true })
    .then(async window => {
      if (Math.abs(new Date().valueOf() - lastIntervalDateValue.valueOf()) >= SLEEP_INTERVAL_MS) {
        console.log(
          'Device had gone to sleep, waking up...',
          `\t\t\tFROM [${lastIntervalDateValue.toLocaleTimeString()}] TO [${new Date().toLocaleTimeString()}]`,
        );
        data.hostname.session.endAll({}, lastIntervalDateValue, hostnames);
        await data.set(hostnames);
      }
      console.log(
        `Window Focus: [${window.id}] [${window.focused ? 'Active' : 'Inactive'}]\t\t\t[${new Date().toLocaleTimeString()}]`,
      );
      if (!window.focused) {
        data.hostname.session.endAll({}, lastIntervalDateValue, hostnames);
        badge.setInactive();
      } else {
        const tab = window.tabs.find(tab => tab.active);
        if (!tab) return;
        const hostname = getHostnameFromTab(tab);
        data.hostname.create(hostname, hostnames);
        data.hostname.session.start(hostname, tab, hostnames);
        data.hostname.setFavIconUrl(hostname, tab.favIconUrl, hostnames);
        data.hostname.session.endAll({ excludeHostnames: [hostname] }, lastIntervalDateValue, hostnames);
      }
      await data.set(hostnames);
      await lastIntervalDate.set(new Date());
    })
    .catch(error => {
      console.log('No Last Focused Window', error);
    });
}, UPDATE_SECONDS_INTERVAL_MS);

setInterval(async () => {
  const hostnames = await data.get();
  await chrome.windows
    .getLastFocused({ populate: true })
    .then(async window => {
      const tab = window.tabs.find(tab => tab.active);
      if (!tab) return;
      const hostname = getHostnameFromTab(tab);
      if (window.focused) {
        badge.setSeconds(data.hostname.getSecondsToday(hostname, hostnames), tab.id);
      }
    })
    .catch(error => {
      console.log('No Last Focused Window', error);
    });
}, 1000 * 60);

chrome.windows.onFocusChanged.addListener(async windowId => {
  console.log(`Window Focus Changed: [${windowId}]\t\t\t[${new Date().toLocaleTimeString()}]`);
  const hostnames = await data.get();
  const lastIntervalDateValue = await lastIntervalDate.get();
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    data.hostname.session.endAll({}, lastIntervalDateValue, hostnames);
    badge.setInactive();
  } else {
    await chrome.windows.getLastFocused({ populate: true }).then(window => {
      if (!window.focused) {
        data.hostname.session.endAll({}, lastIntervalDateValue, hostnames);
        badge.setInactive();
        return;
      }
      const tab = window.tabs.find(tab => tab.active);
      if (!tab) return;
      const hostname = getHostnameFromTab(tab);
      data.hostname.create(hostname, hostnames);
      data.hostname.session.start(hostname, tab, hostnames);
      data.hostname.setFavIconUrl(hostname, tab.favIconUrl, hostnames);
      data.hostname.session.endAll({ excludeHostnames: [hostname] }, lastIntervalDateValue, hostnames);
    });
  }
  await data.set(hostnames);
});

chrome.tabs.onActivated.addListener(async activeInfo => {
  console.log(`Active Tab Change:`, activeInfo);
  const hostnames = await data.get();
  const lastIntervalDateValue = await lastIntervalDate.get();
  await chrome.tabs.get(activeInfo.tabId).then(tab => {
    if (!tab) return;
    console.log(`Active Tab Change [${tab.url}]\t\t\t[${new Date().toLocaleTimeString()}]`);
    const hostname = getHostnameFromTab(tab);
    data.hostname.create(hostname, hostnames);
    data.hostname.session.start(hostname, tab, hostnames);
    data.hostname.setFavIconUrl(hostname, tab.favIconUrl, hostnames);
    data.hostname.session.endAll({ excludeHostnames: [hostname] }, lastIntervalDateValue, hostnames);

    badge.setSeconds(data.hostname.getSecondsToday(hostname, hostnames), tab.id);
  });
  await data.set(hostnames);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const hostnames = await data.get();
    const lastIntervalDateValue = await lastIntervalDate.get();
    if (!tab) return;
    if (tab.active) {
      console.log(`Tab Updated [${tab.url}]\t\t\t[${new Date().toLocaleTimeString()}]`);
      const hostname = getHostnameFromTab(tab);
      data.hostname.create(hostname, hostnames);
      data.hostname.session.start(hostname, tab, hostnames);
      data.hostname.setFavIconUrl(hostname, tab.favIconUrl, hostnames);
      data.hostname.session.endAll({ excludeHostnames: [hostname] }, lastIntervalDateValue, hostnames);

      badge.setSeconds(data.hostname.getSecondsToday(hostname, hostnames), tab.id);
      await data.set(hostnames);
    }
  }
});

chrome.storage.local.onChanged.addListener(changes => {
  for (const [key, { newValue }] of Object.entries(changes)) {
    switch (key) {
      case 'screen-time-web-settings':
        {
          const settings = JSON.parse(newValue) as Settings;
          chrome.action.setBadgeBackgroundColor({ color: settings.badge.value.backgroundColor.value });
          chrome.action.setBadgeTextColor({ color: settings.badge.value.textColor.value });
          break;
        }
      default:
        break;
    }
  }
});

const main = async () => {
  const hostnames = await data.get();
  await data.init(hostnames);
  await data.set(hostnames);
};

main();
