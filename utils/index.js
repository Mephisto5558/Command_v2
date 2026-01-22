const utils = {
  autocompleteGenerator: require('./autocompleteGenerator'),
  checkForErrors: require('./checkForErrors'),
  commandExecutionWrapper: require('./commandExecutionWrapper'),
  commandMention: require('./commandMention'),
  constants: require('./constants'),
  cooldowns: require('./cooldowns'),
  filename: require('./filename'),
  getCommands: require('./getCommands'),
  getDirectories: require('./getDirectories'),
  loadFile: require('./loadFile'),
  permissionTranslator: require('./permissionTranslator')

  /* componentHandler: require('./componentHandler'),
     getCommandName: require('./getCommandName'), */
};

module.exports = utils;