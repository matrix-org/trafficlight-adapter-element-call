import trafficlightConfig from "../../trafficlight.config.json";

import { copyFile, open, readFile } from "fs/promises";

module.exports = {
    "set_video_image": async ({data, page}) => {
        const mediaStorageFolder = process.env["MEDIA_STORAGE_FOLDER"] ?? trafficlightConfig["media-storage-folder"];
        const image = data["image"];
        if (process.env["USE_FFMPEG"] ?? trafficlightConfig["use-ffmpeg"]) {
            // Manage two files here, so ffmpeg stats and reopens repeatedly, rather
            // than when it uses a single file which it loads once.
            // TODO: investigate alternatives to this as it's a bit janky.
            await copyFile("bin/images/" + image + ".png", mediaStorageFolder+"/target0.png");
            await copyFile("bin/images/" + image + ".png", mediaStorageFolder+"/target1.png");
	} else {
            const fd = await open(mediaStorageFolder+"/video.y4m","w");
            const buffer = await readFile("bin/images/"+ image + ".y4m");
            await fd.writeFile(buffer);
            await fd.close();
        }
        // We cycle every second; ensure we've finished cycling before we return
        await page.waitForTimeout(1000);
        return "set_image_done";
    },

    "set_permissions": async ({data, context}) => {
        await context.clear_permissions();

        const permissions = [];
        if (data["camera"] == "true") {
           permissions.push("camera");
        }
        if (data["audio"] == "true") {
           permissions.push("microphone");
        }
        await context.grant_permissions(permissions);
    },

};
