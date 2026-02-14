export default defineNuxtConfig({
  extends: ["docus"],
  app: {
    baseURL: "/datapackages/",
  },
  nitro: {
    prerender: {
      failOnError: false,
    },
  },
});
