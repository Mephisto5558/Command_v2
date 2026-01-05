import config, { getModifiedRule, jsGlob, tsGlob } from '@mephisto5558/eslint-config';

/* eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
config.find(e => e.rules && 'no-underscore-dangle' in e.rules)?.rules['no-underscore-dangle'][1]?.allow
  ?.push?.('__count__'); // Object#count

/**
 * @type {typeof config}
 * This config lists all rules from every plugin it uses. */
export default [
  ...config,
  {
    name: 'templates',
    files: [`templates/*${tsGlob}`, `templates/*${jsGlob}`],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  {
    name: 'overwrite:scripts',
    files: [`**/*${tsGlob}`, `**/*${jsGlob}`],
    languageOptions: {
      globals: {}
    }
  },
  {
    name: 'overwrite:Tests',
    files: [`./tests/**/*${jsGlob}`],
    rules: {
      'id-length': getModifiedRule(config, 'id-length', {
        exceptions: ['t']
      }),
      '@typescript-eslint/no-magic-numbers': 'off',
      'unicorn/no-null': 'off'
    }
  }
];