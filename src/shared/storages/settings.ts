import { BaseStorage, createStorage, StorageType } from '@src/shared/storages/base';
import { Settings } from 'extension';

const SETTINGS_KEY_NAME = 'screen-time-web-settings';

type SettingsStorage = BaseStorage<string>;

const storage = createStorage<string>(
  SETTINGS_KEY_NAME,
  JSON.stringify({
    badge: {
      value: {
        backgroundColor: { value: '#000000', display: 'Background Color' },
        textColor: { value: '#ffffff', display: 'Text Color' },
      },
      display: 'Badge',
    },
  } as Settings),
  {
    storageType: StorageType.Local,
    liveUpdate: true,
  },
);

const settingsStorage: SettingsStorage = {
  ...storage,
};

export default settingsStorage;
