/**
 * DO NOT USE import someModule from '...';
 *
 * @issue-url https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/issues/160
 *
 * Chrome extensions don't support modules in content scripts.
 * If you want to use other modules in content scripts, you need to import them via these files.
 *
 */
const HOSTNAME_NAME_MAP_KEY = 'hostname-name-map';

const getSiteName = () => {
  const ogSiteName = document.querySelector('meta[property="og:site_name"]') as HTMLMetaElement;
  const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
  if (ogSiteName && ogSiteName.content) return ogSiteName.content;
  if (ogTitle && ogTitle.content) return ogTitle.content;

  const url = new URL(window.location.href);
  const hostname = url.hostname;

  return hostname;
};

chrome.storage.local.get({ [HOSTNAME_NAME_MAP_KEY]: JSON.stringify({}) }).then(items => {
  const map = JSON.parse(items[HOSTNAME_NAME_MAP_KEY]);
  const url = new URL(window.location.href);
  const hostname = url.hostname;
  if (!map[hostname]) {
    map[hostname] = getSiteName();
  }
  chrome.storage.local.set({ [HOSTNAME_NAME_MAP_KEY]: JSON.stringify(map) });
});
