export default defineAppConfig({
  docus: {
    title: "DataPackages",
    description:
      "A modern, modular ecosystem for distributing data with strict TypeScript support.",
    image:
      "https://user-images.githubusercontent.com/904724/185365452-87b7caed-1010-4721-8941-5d1d0afdc494.png",
    socials: {
      github: "zaosoula/datapackages",
    },
    aside: {
      level: 0,
      collapsed: false,
      exclude: [],
    },
    header: {
      logo: false,
      showLinkIcon: true,
      exclude: [],
      fluid: true,
    },
  },
  contentMermaid: {
    enabled: true,
    /**
     * @default 'default'
     * @description 'default' or '@nuxtjs/color-mode'
     */
    color: "default",
    spinnerComponent: "DAnimationSpinner",
  },
});
