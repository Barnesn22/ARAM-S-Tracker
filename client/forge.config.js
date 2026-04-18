export default {
  packagerConfig: {
    asar: true,
    icon: 'assets/favicon',
    productName: 'ARAM Stats App',
    ignore: (filePath) => {
      if (!filePath) return false;

      const normalized = filePath.replace("/\\g", '/');

      const allowed = [
        /^\/dist-vite/,
        /^\/electron/,
        /^\/package\.json$/,
        /^\/node_modules/,
        /*/^\/node_modules\/electron-updater/,
        /^\/node_modules\/axios/,
        /^\/node_modules\/follow-redirects/,
        /^\/node_modules\/form-data/,
        /^\/node_modules\/proxy-from-env/,
        /^\/node_modules\/asynckit/,
        /^\/node_modules\/combined-stream/,
        /^\/node_modules\/delayed-stream/,
        /^\/node_modules\/mime-types/,
        /^\/node_modules\/mime-db/,
        /^\/node_modules\/builder-util-runtime/,
        /^\/node_modules\/semver/,
        /^\/node_modules\/fs-extra/,
        /^\/node_modules\/graceful-fs/,
        /^\/node_modules\/jsonfile/,
        /^\/node_modules\/universalify/,
        /^\/node_modules\/js-yaml/,
        /^\/node_modules\/argparse/,
        /^\/node_modules\/lazy-val/,
        /^\/node_modules\/lodash\.isequal/,
        /^\/node_modules\/es-set-tostringtag/,*/
        /^\/assets/,
      ];

      if (allowed.some((r) => r.test(filePath))) return false;

      return true;
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel'
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'Barnesn22',
          name: 'ARAM-S-Tracker'
        },
        prerelease: false,
        draft: false
      }
    }
  ]
};