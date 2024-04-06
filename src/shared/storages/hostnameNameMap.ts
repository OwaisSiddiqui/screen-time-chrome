import { BaseStorage, createStorage, StorageType } from '@src/shared/storages/base';
import { HOSTNAME_NAME_MAP_KEY } from '@root/utils/constants';

type HostnameNameMapStorage = BaseStorage<string>;

const storage = createStorage<string>(
  HOSTNAME_NAME_MAP_KEY,
  JSON.stringify({ 'www.youtube.com': 'YouTube', 'www.twitter.com': 'X', 'www.reddit.com': 'Reddit' }),
  {
    storageType: StorageType.Local,
    liveUpdate: true,
  },
);

const hostnameNameMapStorage: HostnameNameMapStorage = {
  ...storage,
};

export default hostnameNameMapStorage;
