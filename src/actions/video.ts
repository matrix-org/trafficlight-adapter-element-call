
import { copyFile } from "fs/promises";
import { rename } from "fs/promises";
module.exports = {
    "set_video": async ({data}) => {
        const image = data["image"];
        // Manage two files here, so ffmpeg stats and reopens repeatedly, rather
        await copyFile("video/images/" + image + ".png", "video/images/target0-new.png");
        await copyFile("video/images/" + image + ".png", "video/images/target1-new.png");
        await rename("video/images/target0-new.png", "video/images/target0.png");
        await rename("video/images/target1-new.png", "video/images/target1.png");
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
