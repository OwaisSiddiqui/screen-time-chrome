import React, { useRef, useMemo, useState, useEffect } from 'react';
import useStorage from '@src/shared/hooks/useStorage';
import withSuspense from '@src/shared/hoc/withSuspense';
import withErrorBoundary from '@src/shared/hoc/withErrorBoundary';
import hostnamesStorage from '@root/src/shared/storages/hostnames';
import { HostnameNameMap, Hostnames, Settings } from 'extension';
import { transformData } from '@root/utils';
import hostnameNameMapStorage from '@root/src/shared/storages/hostnameNameMap';
import ArrowRight from '@assets/arrow-right.svg';
import ArrowLeft from '@assets/arrow-left.svg';
import SettingsIcon from '@assets/settings.svg';
import CloseIcon from '@assets/close.svg';
import settingsStorage from '@root/src/shared/storages/settings';

type HostnamesArrayToday = {
  totalSeconds: number;
  sessions: {
    start: string;
    end: string;
    seconds: number;
    name: string;
  }[];
  favIconUrl: string;
  name: string;
}[];

const TOTAL_MS_DAY = 86400000;
const TIMEBAR_HOURS = ['12am', '6am', '12pm', '6pm', '12am'];

const displaySeconds = (seconds: number) => {
  const units = [
    { name: 'year', value: 365 * 24 * 60 * 60 },
    { name: 'month', value: 30 * 24 * 60 * 60 }, // Approximate average month
    { name: 'week', value: 7 * 24 * 60 * 60 },
    { name: 'day', value: 24 * 60 * 60 },
    { name: 'hour', value: 60 * 60, display: 'hr' },
    { name: 'minute', value: 60, display: 'min' },
    { name: 'second', value: 1, display: 's' },
  ];

  let result = '';
  let unitsUsed = 0;

  for (let i = 0; i < units.length; i++) {
    const unitValue = units[i].value;
    const count = Math.floor(seconds / unitValue);

    if (count > 0) {
      if (unitsUsed === 2) {
        break;
      }

      result += `${count}${units[i].display ?? units[i].name[0]} `;
      seconds -= count * unitValue;
      unitsUsed++;
    } else if (count === 0 && unitsUsed > 0) {
      unitsUsed++;
    }
  }

  return result.trim();
};

const getPointerLeft = (event, left: number) => {
  return event.clientX - left;
};

function msToTime(milliseconds) {
  // Create a Date object at the beginning of the day
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Add the milliseconds to the start of the day
  const date = new Date(startOfDay.getTime() + milliseconds);

  // Format the date into a time string
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

const Site = ({
  site,
  hostnameNameMap,
  longestSeconds,
  currentHostname,
  isLast,
  setSelectedHostname,
}: {
  site: HostnamesArrayToday[number];
  hostnameNameMap: HostnameNameMap;
  longestSeconds: number;
  currentHostname: string;
  selectedHostname: string;
  isLast: boolean;
  setSelectedHostname: (hostname: string) => void;
  isGray: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isCurrent = useMemo(() => {
    return site.name === currentHostname;
  }, [site.name, currentHostname]);

  return (
    <div
      style={{ cursor: isHovered && !isCurrent ? 'pointer' : 'auto' }}
      className={`flex gap-3 transition ease-in-out pt-2 w-full`}
      onMouseEnter={() => {
        setIsHovered(true);
        setSelectedHostname(site.name);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setSelectedHostname(currentHostname);
      }}>
      <div className={`flex w-[20px] h-[20px] self-end mb-3`}>
        {site.favIconUrl ? (
          <img
            alt={`${site.name} favicon`}
            className=""
            src={`https://www.google.com/s2/favicons?domain=${site.name}&sz=${32}`}
          />
        ) : (
          <div className="relative w-full h-full text-gray-300 rounded-md flex">
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 24 24"
              height="100%"
              width="100%"
              xmlns="http://www.w3.org/2000/svg">
              <path fill="none" d="M0 0h24v24H0z"></path>
              <path d="m21.9 21.9-6.1-6.1-2.69-2.69L5 5 3.59 3.59 2.1 2.1.69 3.51 3 5.83V19c0 1.1.9 2 2 2h13.17l2.31 2.31 1.42-1.41zM5 19V7.83l6.84 6.84-.84 1.05L9 13l-3 4h8.17l2 2H5zM7.83 5l-2-2H19c1.1 0 2 .9 2 2v13.17l-2-2V5H7.83z"></path>
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <div className="font-medium text-[10px] overflow-hidden whitespace-nowrap text-ellipsis">
          {hostnameNameMap[site.name] || site.name || site.sessions[site.sessions.length - 1].name || 'No title'}
        </div>
        <div className="flex flex-col">
          <div className="flex flex-col w-[80%]">
            <div
              className="relative rounded-full bg-[#D9D9D9] h-[4px]"
              style={{
                width: `${(Math.floor(site.totalSeconds) / longestSeconds) * 100}%`,
                backgroundColor: isCurrent ? '#19C87F' : isHovered ? '#77eebc' : '',
              }}>
              <div
                style={{ left: `calc(100% + 0.5rem)` }}
                className="whitespace-nowrap absolute text-[#808080] text-[8px] top-1/2 -translate-y-1/2">
                {Math.floor(site.totalSeconds) > 0 ? displaySeconds(site.totalSeconds) : displaySeconds(1)}
              </div>
            </div>
          </div>
          <div className={`h-[1px] bg-[#F3F3F3] mt-3 ${isLast && 'invisible'}`}></div>
        </div>
      </div>
    </div>
  );
};

const Timebar = ({
  hostnamesArrayToday,
  selectedHostname,
}: {
  hostnamesArrayToday: HostnamesArrayToday;
  selectedHostname: string;
}) => {
  const nowTickRef = useRef<HTMLDivElement | null>(null);
  const nowTickTextRef = useRef<HTMLDivElement | null>(null);
  const timebarData = useMemo(() => {
    const result: { left: number; width: number; hostname: string }[] = [];
    hostnamesArrayToday.forEach(site => {
      site.sessions.forEach(session => {
        const startDate = new Date(session.start);
        const endDate = new Date(session.end);
        const startMs = getTodayMs(startDate);
        const width = (endDate.getTime() - startDate.getTime()) / TOTAL_MS_DAY;
        result.push({
          left: startMs / TOTAL_MS_DAY,
          width: width,
          hostname: site.name,
        });
      });
    });
    return result;
  }, [hostnamesArrayToday]);

  return (
    <div
      className="flex flex-col relative w-full h-[30px]"
      onMouseMove={event => {
        const elm = event.currentTarget;
        const boundingClientRect = elm.getBoundingClientRect();
        let left = getPointerLeft(event, boundingClientRect.left);
        left = Math.max(0, left);
        if (nowTickTextRef.current) {
          const nowTick = nowTickRef.current;
          nowTick.style.left = `${left}px`;
          const percent = left / boundingClientRect.width;
          nowTickTextRef.current.innerHTML = `${msToTime(TOTAL_MS_DAY * percent)}`;
        }
      }}
      onMouseLeave={() => {
        if (nowTickTextRef.current && nowTickRef.current) {
          nowTickRef.current.style.left = `${(getTodayMs(new Date()) / TOTAL_MS_DAY) * 268}px`;
          nowTickTextRef.current.innerHTML = `Now`;
          nowTickTextRef.current.style.left = `initial`;
        }
      }}>
      <div className="absolute top-full w-full">
        {TIMEBAR_HOURS.map((text, i) => {
          return (
            <>
              <div
                style={{ left: `${(i / (TIMEBAR_HOURS.length - 1)) * 100}%` }}
                className={`gap-[1.5px] absolute top-0 ${i == TIMEBAR_HOURS.length - 1 ? '-translate-x-full' : i !== 0 ? '-translate-x-1/2' : ''} text-[#B3B3B3] flex flex-col`}>
                <div
                  className={`${i == TIMEBAR_HOURS.length - 1 ? 'self-end' : i !== 0 ? 'self-center' : ''} h-[2.5px] w-[1px] bg-[#d6d9dc]`}></div>
                {text}
              </div>
            </>
          );
        })}
      </div>
      <div
        ref={nowTickRef}
        style={{ left: `${(getTodayMs(new Date()) / TOTAL_MS_DAY) * 268}px`, top: '0px' }}
        className="pointer-events-none absolute gap-[4px] text-[7px] text-[#ED6400] flex flex-col items-center w-[0.5px] h-[30px] bg-[#ED6400]">
        <div ref={nowTickTextRef} className="absolute top-full mt-[4px] whitespace-nowrap bg-white">
          Now
        </div>
      </div>
      <svg
        className="rounded-sm"
        width="100%"
        height="100%"
        style={{ scrollbarGutter: 'auto', backgroundColor: '#F3F2F4' }}>
        {timebarData.map((data, i) => {
          return (
            <rect
              key={`${data.hostname}${i}`}
              x={`${data.left * 268}px`}
              y="0"
              width={`${data.width * 268}`}
              height="100%"
              fill={selectedHostname === data.hostname ? '#19C87F' : 'black'}
            />
          );
        })}
      </svg>
    </div>
  );
};

const getTodayMs = (date: Date) => {
  return date.getHours() * 3600000 + date.getMinutes() * 60000 + date.getSeconds() * 1000 + date.getMilliseconds();
};

function dateDiffInDays(a: Date, b: Date) {
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / TOTAL_MS_DAY);
}

const ColorPicker = ({
  settings,
  colorKey,
}: {
  settings: Settings;
  colorKey: keyof Settings['badge']['value'];
}) => {

  return <input type="color" value={settings['badge']['value'][colorKey].value} onChange={(e) => {
    const elm = e.currentTarget
    const color = elm.value
    const newSettings = settings;
    newSettings['badge']['value'][colorKey]['value'] = color;
    settingsStorage.set(JSON.stringify(newSettings));
  }} />;
};

const Popup = () => {
  const hostnamesValue = useStorage(hostnamesStorage);
  const hostnameNameMapValue = useStorage(hostnameNameMapStorage);
  const settingsValue = useStorage(settingsStorage);

  const [currentHostname, setCurrentHostname] = useState<string>('');
  const [selectedHostname, setSelectedHostname] = useState<string>('');
  const [currentDate, setcurrentDate] = useState(new Date());

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const hostnames = useMemo<Hostnames>(() => {
    return JSON.parse(hostnamesValue);
  }, [hostnamesValue]);

  const hostnameNameMap = useMemo<HostnameNameMap>(() => {
    return JSON.parse(hostnameNameMapValue);
  }, [hostnameNameMapValue]);

  const settings = useMemo<Settings>(() => {
    return JSON.parse(settingsValue);
  }, [settingsValue]);

  const data = useMemo(() => {
    return transformData(hostnames);
  }, [hostnames]);
  const longestSecondsToday = useMemo(() => {
    const todayDateKey = currentDate.toLocaleDateString('en-CA');
    return data[todayDateKey] ? data[todayDateKey].longestSeconds : 0;
  }, [data, currentDate]);
  const totalSecondsToday = useMemo(() => {
    const dateKey = currentDate.toLocaleDateString('en-CA');
    return data[dateKey] ? data[dateKey].totalSeconds : 0;
  }, [data, currentDate]);

  const hostnamesArrayToday: HostnamesArrayToday = useMemo<HostnamesArrayToday>(() => {
    if (!data[currentDate.toLocaleDateString('en-CA')]) {
      return [];
    }
    const names = data[currentDate.toLocaleDateString('en-CA')]['hostnames'];
    const result = [];
    for (const hostname in names) {
      result.push({
        name: hostname,
        favIconUrl: hostnames[hostname].favIconUrl,
        sessions: names[hostname].sessions,
        totalSeconds: names[hostname].totalSeconds,
      });
    }
    result.sort((a, b) => {
      return b.totalSeconds - a.totalSeconds;
    });
    return result;
  }, [data, hostnames, currentDate]);

  const dateHeading = useMemo(() => {
    const diff = dateDiffInDays(currentDate, new Date());
    if (diff === 0) {
      return 'Today';
    } else {
      return `${diff} day${diff !== 1 ? 's' : ''} - ${currentDate.toLocaleDateString('en-CA')}`;
    }
  }, [currentDate]);

  const isNextNavigationDisabled = useMemo(() => {
    return currentDate.toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA');
  }, [currentDate]);

  const datesInDataSorted = useMemo(() => {
    const dates = Object.keys(data);
    return dates.sort();
  }, [data]);

  const isPrevNavigationDisabled = useMemo(() => {
    return datesInDataSorted.length > 0 ? currentDate.toLocaleDateString('en-CA') === datesInDataSorted[0] : true;
  }, [currentDate, datesInDataSorted]);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      const tab = tabs[0];
      if (!tab) return;
      const url = new URL(tab.url);
      setCurrentHostname(url.hostname || url.href);
      setSelectedHostname(url.hostname || url.href);
    });
  }, []);

  return (
    <main className={`flex flex-col relative w-full`}>
      <div
        className={`${isSettingsOpen ? 'flex' : 'hidden'} flex-col bg-white fixed z-20 top-0 left-0 w-full h-screen p-4 gap-3`}>
        <div className="flex justify-between">
          <h1 className="text-base font-semibold">Settings</h1>
          <button
            onClick={() => {
              setIsSettingsOpen(false);
            }}
            className="hover:bg-gray-100 p-1 rounded-sm">
            <img alt="close" src={CloseIcon} />
          </button>
        </div>
        <div className="flex flex-col h-full">
          {Object.keys(settings).map((key: keyof Settings) => {
            if (key === 'badge') {
              return (
                <div key={key}>
                  <h2 className="font-medium pb-3">{settings['badge']['display']}</h2>
                  <div className="flex flex-col gap-1">
                    {Object.keys(settings['badge']['value']).map((key: keyof Settings['badge']['value']) => {
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <span className="text-[11px]">{settings['badge']['value'][key]['display']}</span>
                          <div className="flex w-6 h-2">
                            <ColorPicker
                              colorKey={key}
                              settings={settings}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {(settings['badge']['value']['backgroundColor']['value'] !== '#000000' ||
                    settings['badge']['value']['textColor']['value'] !== '#ffffff') && (
                    <button
                      onClick={() => {
                        const newSettings = settings;
                        newSettings['badge']['value']['backgroundColor']['value'] = '#000000';
                        newSettings['badge']['value']['textColor']['value'] = '#ffffff';
                        settingsStorage.set(JSON.stringify(newSettings));
                      }}
                      className="border bg-gray-100 border-gray-300 mt-4 px-1 rounded-sm text-[9px]">
                      Reset
                    </button>
                  )}
                </div>
              );
            }
          })}
          <div className="flex mt-auto">
            If you are experiencing any bugs or would like to contact the developer of this extension, please email
            strikerzs.dev@gmail.com
          </div>
        </div>
      </div>
      <div className="flex flex-col sticky top-0 bg-white z-10 px-4 pt-4 border-gray-100 pb-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between">
            <span className="text-[10px] text-[#555555]">{dateHeading}</span>
            <div className="flex gap-2">
              <button
                disabled={isPrevNavigationDisabled}
                onClick={() => {
                  const prevDate = new Date(currentDate);
                  prevDate.setDate(prevDate.getDate() - 1);
                  if (!isPrevNavigationDisabled) {
                    setcurrentDate(prevDate);
                  }
                }}
                className={`enabled:hover:bg-gray-100 p-1 rounded-sm disabled:opacity-25`}>
                <img alt="left arrow" src={ArrowLeft} />
              </button>
              <button
                disabled={isNextNavigationDisabled}
                onClick={() => {
                  const nextDate = new Date(currentDate);
                  nextDate.setDate(nextDate.getDate() + 1);
                  if (!isNextNavigationDisabled) {
                    setcurrentDate(nextDate);
                  }
                }}
                className={`enabled:hover:bg-gray-100 p-1 rounded-sm disabled:opacity-25`}>
                <img alt="right arrow" src={ArrowRight} />
              </button>
              <button
                onClick={() => {
                  setIsSettingsOpen(true);
                }}
                className="hover:bg-gray-100 p-1 rounded-sm">
                <img alt="settings" src={SettingsIcon} />
              </button>
            </div>
          </div>
          <span className="font-semibold text-[18px] pb-1.5">
            {totalSecondsToday > 0 ? displaySeconds(totalSecondsToday) : 'None'}
          </span>
        </div>
        <div className="flex flex-col relative text-[7px] pt-[2px] text-white">
          <Timebar selectedHostname={selectedHostname} hostnamesArrayToday={hostnamesArrayToday} />
          <span className="pt-[4px]">&nspb;</span>
        </div>
      </div>
      <div className={`relative flex flex-col px-4 pb-4 min-h-[5rem]`}>
        {hostnamesArrayToday.length > 0 ? (
          hostnamesArrayToday.map((hostname, i) => {
            return (
              <>
                <Site
                  setSelectedHostname={setSelectedHostname}
                  isGray={i % 2 === 0}
                  selectedHostname={selectedHostname}
                  hostnameNameMap={hostnameNameMap}
                  site={hostname}
                  longestSeconds={longestSecondsToday}
                  currentHostname={currentHostname}
                  isLast={i === hostnamesArrayToday.length - 1}
                />
              </>
            );
          })
        ) : (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-[7px] text-gray-400 align-middle self-center">
            No data available.
          </span>
        )}
      </div>
    </main>
  );
};

export default withErrorBoundary(
  withSuspense(Popup, <div></div>),
  <div className="p-4">{`Error trying to display extension. Plese reload and try again. If that does not work, please contact the dev (email in the Chrome Web Store - Screen Time Web page). Thank you and apologies for the inconvenience.`}</div>,
);
