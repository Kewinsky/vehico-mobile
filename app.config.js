const { getAppDisplayName } = require("./app-brand.js");

/** @param {{ config: import('@expo/config-types').ExpoConfig }} ctx */
module.exports = ({ config }) => {
  const APP_DISPLAY_NAME = getAppDisplayName();
  return {
    ...config,
    name: APP_DISPLAY_NAME,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSCameraUsageDescription: `${APP_DISPLAY_NAME} needs camera access to capture and upload vehicle photos and attachments.`,
        NSPhotoLibraryUsageDescription: `${APP_DISPLAY_NAME} needs photo library access to select and upload vehicle photos and attachments.`,
        NSPhotoLibraryAddUsageDescription: `${APP_DISPLAY_NAME} may save exported images to your photo library when you choose to do so.`,
      },
    },
  };
};
