import config, { getModifiedRule, pluginNames, tsGlob } from '@mephisto5558/eslint-config';

export default [
  ...config,
  {
    name: 'templates',
    files: [`templates/*${tsGlob}`],
    rules: {
      [`${pluginNames.typescript}/no-empty-function`]: 'off',
      [`${pluginNames.typescript}/no-unused-vars`]: 'off'
    }
  },
  {
    name: 'overwrite:scripts',
    files: [`**/*${tsGlob}`],
    languageOptions: {
      globals: {}
    },
    rules: {
      'max-lines': 'off', // Class definitions may just be longer.
      [`${pluginNames.typescript}/consistent-type-definitions`]: 'off', // Using interfaces where needed
      ...getModifiedRule(config, `${pluginNames.import}/no-namespace`, [{
        ignore: ['discord.js'] // prevent ugly renaming
      }])
    }
  },
  {
    name: 'overwrite:utils',
    files: [`**/utils/*${tsGlob}`],
    rules: {
      [`${pluginNames.import}/prefer-default-export`]: 'off'
    }
  },
  {
    name: 'overwrite:schemata',
    files: ['**/*Schema.jsonc'],
    rules: {
      [`${pluginNames.jsonc}/sort-keys`]: 'off',
      [`${pluginNames.jsonc}/sort-array-values`]: 'off',
      [`${pluginNames.jsonc}/key-name-casing`]: 'off'
    }
  },
  {
    name: 'overwrite:Tests',
    files: [`./tests/**/*${tsGlob}`],
    rules: {
      ...getModifiedRule(config, 'id-length', [{
        exceptions: ['t']
      }]),
      [`${pluginNames.typescript}/no-magic-numbers`]: 'off',
      [`${pluginNames.unicorn}/no-null`]: 'off'
    }
  }
] as typeof config;