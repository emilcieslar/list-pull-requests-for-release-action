const core = require('@actions/core');


function setOutputWithDebug(key, value) {
  core.debug(`Setting output: key: "${key}", value: "${value}"`);
  core.setOutput(key, value);
}


export default setOutputWithDebug;
