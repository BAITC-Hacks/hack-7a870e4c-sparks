require("dotenv").config();

module.exports = {
  api: {
    input: "../../apps/api/openapi.json",
    output: {
      target: "./src/shared/api/generated.ts",
      client: "axios",
      override: {
        mutator: {
          path: "./src/shared/lib/client/custom-instance.ts",
          name: "customInstance",
        },
      },
    },
  },
};
