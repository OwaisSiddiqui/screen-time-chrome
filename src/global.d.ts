declare module 'virtual:reload-on-update-in-background-script' {
  export const reloadOnUpdate: (watchPath: string) => void;
  export default reloadOnUpdate;
}

declare module 'virtual:reload-on-update-in-view' {
  const refreshOnUpdate: (watchPath: string) => void;
  export default refreshOnUpdate;
}

declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: string;
  export default content;
}

declare module 'extension' {
  export type Hostnames = {
    [key: string]: {
      sessions: {
        start: string;
        end: string;
        name: string;
        url: string;
      }[];
      badgeSeconds: number;
      isActive: boolean;
      favIconUrl: string;
    };
  };

  export type HostnameNameMap = {
    [key: string]: stromg;
  };

  export type Settings = {
    badge: {
      value: {
        backgroundColor: {
          value: string;
          display: 'Background Color';
        };
        textColor: {
          value: string;
          display: 'Text Color';
        };
      };
      display: 'Badge';
    };
  };
}
