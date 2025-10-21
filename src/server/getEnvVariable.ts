if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

export const getEnvVariable = (name: string) => {
  return process.env[name];
};
