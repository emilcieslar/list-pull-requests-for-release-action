import * as core from '@actions/core'


function getInputWithDebug(key) {
  const input = core.getInput(key);
  core.debug(`Getting input for key: "${key}", resulting input: "${input}"`);
  return input;
}


export default getInputWithDebug;
