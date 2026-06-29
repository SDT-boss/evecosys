/**
 * Stub for next/config — removed in Next.js 16.
 * Required by @storybook/nextjs preset which tries to resolve this module.
 */
function getConfig() {
  return { serverRuntimeConfig: {}, publicRuntimeConfig: {} };
}

function setConfig() {}

module.exports = getConfig;
module.exports.getConfig = getConfig;
module.exports.setConfig = setConfig;
module.exports.default = getConfig;
