import { Page }  from "playwright";

var offset = 0

module.exports = {
    "create_or_join": async ({ page, data }: { page: Page, data: any }) => {
        await page.getByTestId("home_callName").fill(data["callName"]);
        await page.getByTestId("home_displayName").fill(data["displayName"]);
	await page.getByTestId("home_go").click();
        var is_existing = false;
	if (await page.getByTestId("home_joinExistingRoom").isVisible()) {
            await page.getByTestId("home_joinExistingRoom").click();
            is_existing = true;
        }
        // await page.getByTestId("call") # assert we get to the next page before returning
        return { "response": "create_or_join", "existing": is_existing };
    },

    "lobby_join": async ({ page, data }: { page: Page, data: any }) => {
        await page.getByTestId("lobby_joinCall").click();
        return "lobby_join";
    },

    "get_call_data": async ({page, data}: { page: Page, data: any }) => {
        const videos = [];
        let i = 0;
        const files = {};
        for (const video of await page.getByTestId("videoTile").all()) {
            const caption = await video.getByTestId("videoTile_caption").textContent();
            const muted = await video.getByTestId("videoTile_muted").count() != 0;
            const snapshot_name = "snapshot_video_"+(offset++)+"_"+(i++)+".png";
            await video.getByTestId("videoTile_video").screenshot({ path: snapshot_name });
            // permit indirect mapping of name to filename, if needed.
            files[snapshot_name] = snapshot_name;
            videos.push({caption: caption, muted: muted, snapshot: snapshot_name});
        }
        return { "response": "get_call_data", "data": { "videos": videos }, "_upload_files": files };

    },

    "start_screenshare": async ({ page, data }: { page: Page, data: any }) => {
       await page.getByTestId("incall_screenshare").click();
       return "started_screenshare";
    },
};
