import { BaseStorage, createStorage, StorageType } from '@src/shared/storages/base';
import { DATA_KEY } from '@root/utils/constants';

type HostnamesStorage = BaseStorage<string>;

const storage = createStorage<string>(DATA_KEY, JSON.stringify({}), {
  storageType: StorageType.Local,
  liveUpdate: true,
});

const hostnamesStorage: HostnamesStorage = {
  ...storage,
};

export default hostnamesStorage;
