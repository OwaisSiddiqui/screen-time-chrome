import { Hostnames } from 'extension';
import { Console } from 'console';

export const logger = {
  dev: (...params: Parameters<Console['log']>) => {
    const isDev = import.meta.env.MODE === 'development';
    if (isDev) {
      console.log(...params);
    }
  },
};

export const secondsToText = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }
};

export const getHostnameFromTab = (tab: chrome.tabs.Tab) => {
  let url: URL;
  try {
    url = new URL(tab.url);
  } catch (error) {
    return tab.url;
  }
  return url.hostname || url.href || tab.url;
};

export const getUsageByDay = (data: Hostnames) => {
  const result: { [hostname: string]: { [date: string]: number } } = {};

  for (const hostname in data) {
    const { sessions } = data[hostname];

    for (const session of sessions) {
      const startDate = new Date(session.start);
      const endDate = new Date(session.end ?? new Date());

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toLocaleDateString('en-CA');

        if (!result[hostname]) {
          result[hostname] = {};
        }

        if (!result[hostname][dateKey]) {
          result[hostname][dateKey] = 0;
        }

        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const sessionStart = currentDate > startDate ? currentDate : startDate;
        const sessionEnd =
          currentDate.toLocaleDateString('en-CA') !== endDate.toLocaleDateString('en-CA') ? endOfDay : endDate;

        const duration = (sessionEnd.valueOf() - sessionStart.valueOf()) / 1000;

        result[hostname][dateKey] += duration;

        currentDate.setDate(endOfDay.getDate() + 1);
      }
    }
  }

  return result;
};

export function transformData(data: Hostnames) {
  const result: {
    [date: string]: {
      longestSeconds: number;
      totalSeconds: number;
      hostnames: {
        [hostname: string]: {
          totalSeconds: number;
          sessions: { start: string; end: string; name: string; seconds: number }[];
        };
      };
    };
  } = {};

  for (const hostname in data) {
    const { sessions } = data[hostname];

    for (const session of sessions) {
      const startDate = new Date(session.start);
      const endDate = new Date(session.end ?? new Date());

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toLocaleDateString('en-CA');

        if (!result[dateKey]) {
          result[dateKey] = { longestSeconds: 0, totalSeconds: 0, hostnames: {} };
        }

        if (!result[dateKey]['hostnames'][hostname]) {
          result[dateKey]['hostnames'][hostname] = { sessions: [], totalSeconds: 0 };
        }

        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const sessionStart = currentDate > startDate ? currentDate : startDate;
        const sessionEnd =
          currentDate.toLocaleDateString('en-CA') !== endDate.toLocaleDateString('en-CA') ? endOfDay : endDate;

        const duration = (sessionEnd.valueOf() - sessionStart.valueOf()) / 1000;

        const splitSession = {
          start: sessionStart.toISOString(),
          end: sessionEnd.toISOString(),
          name: session.name,
          seconds: duration,
        };

        result[dateKey]['hostnames'][hostname]['sessions'].push(splitSession);
        result[dateKey]['hostnames'][hostname]['totalSeconds'] += duration;
        result[dateKey]['totalSeconds'] += duration;

        currentDate.setDate(endOfDay.getDate() + 1);
      }
    }
  }

  for (const dateKey in result) {
    const hostnames = result[dateKey]['hostnames'];

    for (const hostname in hostnames) {
      const seconds = hostnames[hostname].totalSeconds;
      if (seconds >= result[dateKey].longestSeconds) {
        result[dateKey].longestSeconds = seconds;
      }
    }
  }

  return result;
}
