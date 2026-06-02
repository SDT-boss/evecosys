module.exports = {
  source: ["tokens/tokens.json"],
  platforms: {
    css: {
      transformGroup: "css",
      prefix: "ds",
      buildPath: "tokens/",
      files: [
        {
          destination: "variables.css",
          format: "css/variables",
          options: { selector: ":root", outputReferences: false },
        },
      ],
    },
    js: {
      transformGroup: "js",
      prefix: "ds",
      buildPath: "tokens/",
      files: [
        {
          destination: "tokens.js",
          format: "javascript/es6",
        },
      ],
    },
  },
};
