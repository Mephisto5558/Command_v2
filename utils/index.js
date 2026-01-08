const utils = {
  autocompleteGenerator: require('./autocompleteGenerator'),
  commandExecutionWrapper: require('./commandExecutionWrapper'),
  checkForErrors: require('./checkForErrors'),
  constants: require('./constants'),

  /* commandMention: require('./commandMention'),
     componentHandler: require('./componentHandler'), */
  formatCommand: require('./formatCommand'),

  // getCommandName: require('./getCommandName'),
  getCommands: require('./getCommands'),
  localizeUsage: require('./localizeUsage'),
  permissionTranslator: require('./permissionTranslator')
};

module.exports = utils;