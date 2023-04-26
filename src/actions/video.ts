
import { copyFile } from "fs/promises";
//import { rename } from "fs/promises";
module.exports = {
    "set_video": async ({data}) => {
        const image = data["image"];
        await copyFile("video/images/" + image + ".png", "video/images/target.png");
//        await rename("video/images/target-next.png", "video/images/target.png");
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
