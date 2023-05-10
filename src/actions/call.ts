import { Page }  from "playwright";

// Each time we get_call_data, increment by one
// This provides unique and related screenshot names.
var call_data_request = 0;

module.exports = {
    "create_or_join": async ({ page, data }: { page: Page, data: any }) => {
        await page.getByTestId("home_callName").fill(data["call_name"]);
        if (data["display_name"]) {
            await page.getByTestId("home_displayName").fill(data["display_name"]);
        } else {
           console.log("no display name required");
        }
	await page.getByTestId("home_go").click();
        var is_existing = false;

	const joinExistingRoom = page.getByTestId("home_joinExistingRoom");
        const lobbyJoinCall = page.getByTestId("lobby_joinCall");

        await Promise.race([
            joinExistingRoom.waitFor(),
            lobbyJoinCall.waitFor()
        ]);
	
	if (await page.getByTestId("home_joinExistingRoom").isVisible()) {
            await page.getByTestId("home_joinExistingRoom").click();
            is_existing = true;
        }
        return { "response": "create_or_join", "existing": is_existing };
    },

    "lobby_join": async ({ page }: { page: Page } ) => {
        await page.getByTestId("lobby_joinCall").click();
        return "lobby_join";
    },

    "get_call_data": async ({page}: { page: Page }) => {
        const videos = [];
      
        // increment i each screenshot we take
        let i = 0;
        call_data_request++;
        const files = {};
        for (const video of await page.getByTestId("videoTile").all()) {
            i++;
            
            const caption = await video.getByTestId("videoTile_caption").textContent();
            const muted = await video.getByTestId("videoTile_muted").count() != 0;
            const snapshot_name = `snapshot_video_${call_data_request}_${i}.png`;
            await video.getByTestId("videoTile_video").screenshot({ path: snapshot_name });
            // permit indirect mapping of name to filename, if needed.
            files[snapshot_name] = snapshot_name;
            videos.push({caption: caption, muted: muted, snapshot: snapshot_name});
        }
        return { "response": "get_call_data", "data": { "videos": videos }, "_upload_files": files };

    },

    "start_screenshare": async ({ page }: { page: Page }) => {
       await page.getByTestId("incall_screenshare").click();
       return "started_screenshare";
    },
};
