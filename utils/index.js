const utils = {
  autocompleteGenerator: require('./autocompleteGenerator'),
  checkForErrors: require('./checkForErrors'),
  commandExecutionWrapper: require('./commandExecutionWrapper'),
  constants: require('./constants'),
  cooldowns: require('./cooldowns'),
  filename: require('./filename'),
  getCommands: require('./getCommands'),
  getDirectories: require('./getDirectories'),
  permissionTranslator: require('./permissionTranslator')

  /* commandMention: require('./commandMention'),
     componentHandler: require('./componentHandler'), */

  // getCommandName: require('./getCommandName'),
};

module.exports = utils;