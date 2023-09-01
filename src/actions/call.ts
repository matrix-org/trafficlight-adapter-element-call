import { Page }  from "playwright";

// Each time we get_call_data, increment by one
// This provides unique and related screenshot names.
var call_data_request = 0;

module.exports = {
    "join_by_url": async ({ page, data} : {page: Page, data: any }) => {
        const url = data["call_url"];
        await page.goto(url);

        const needsDisplayName = page.getByTestId("joincall_displayName");
        const lobbyJoinCall = page.getByTestId("lobby_joinCall");

        await Promise.race([
            needsDisplayName.waitFor(),
            lobbyJoinCall.waitFor()
        ]);
        const needs_name = await page.getByTestId("joincall_displayName").count() != 0;
        if (needs_name) {
            await page.getByTestId("joincall_displayName").fill(data["display_name"]);
            await page.getByTestId("joincall_joincall").click();
        }
        return "joined_by_url";
    },
    "create_or_join": async ({ page, data }: { page: Page, data: any }) => {
        await page.waitForTimeout(500); // this seems infrequently unhappy if we fill this in too soon.
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

    "get_lobby_data": async ({context, page, data}: { page: Page, data: any, context: any }) => {
      
        // increment i each screenshot we take
        let i = 0;
        call_data_request++;
        const audioMutedPromise = page.getByTestId("icon_audiomute").waitFor().then(() => { return true; });
        const audioUnmutedPromise = page.getByTestId("icon_audio").waitFor().then(() => { return false; });
        const audioMuted = await Promise.race([
            audioMutedPromise,
            audioUnmutedPromise
        ]);
        const videoMutedPromise = page.getByTestId("icon_videomute").waitFor().then(() => { return true; });
        const videoUnmutedPromise = page.getByTestId("icon_video").waitFor().then(() => { return false; });
        const videoMuted = await Promise.race([
            videoMutedPromise,
            videoUnmutedPromise
        ]);
        const snapshot_name = `snapshot_video_${call_data_request}_${i}.png`;
        await page.getByTestId("preview_video").screenshot({ path: snapshot_name });
        const files = {};
	files[snapshot_name] = snapshot_name;

        const page_url = page.url();
	
	await page.getByTestId("lobby_inviteLink").click();

	// Scream now: We can't access the clipboard directly, but we can make a new page; paste into it; then read what the output was. 
	const temp_page = await context.newPage();
        await temp_page.setContent("<div data-testid=paste contenteditable></div>");
        await temp_page.getByTestId("paste").focus();
        await temp_page.keyboard.press("Control+KeyV");
        const invite_url = await temp_page.evaluate(() => document.querySelector("div").textContent);
        await temp_page.close();
	const call_name = await page.getByTestId("roomHeader_roomName").textContent();
        return { "response": "get_lobby_data", "data": { "videomuted": videoMuted, "muted": audioMuted, "snapshot": snapshot_name, "page_url": page_url, "invite_url": invite_url, "call_name": call_name }, "_upload_files": files };

    },
    "lobby_join": async ({ page, data }: { page: Page, data: any }) => {
        await page.getByTestId("lobby_joinCall").click();
        return "lobby_join";
    },

    "get_call_data": async ({context, page, data}: { page: Page, data: any, context: any }) => {
        const videos = [];
      
        // increment i each screenshot we take
        let i = 0;
        call_data_request++;
        const files = {};
        for (const video of await page.getByTestId("videoTile").all()) {
            i++;
            // Text name of the tile
            const caption = await video.getByTestId("videoTile_caption").textContent();
            // voice muted icon on the tile
            const muted = await video.getByTestId("videoTile_muted").isVisible();
            // avatar being rendered?
            const avatar = await video.getByTestId("videoTile_avatar").isVisible();
            // picture of the video tile
            const snapshot_name = `snapshot_video_${call_data_request}_${i}.png`;
            await video.getByTestId("videoTile_video").screenshot({ path: snapshot_name });
            // permit indirect mapping of name to filename, if needed.
            files[snapshot_name] = snapshot_name;
            videos.push({caption: caption, muted: muted, snapshot: snapshot_name, avatar: avatar});
        }

        const page_url = page.url();

	// Open the settings menu and click the invite link
	await page.getByTestId("call_invite").click();
	await page.getByTestId("modal_inviteLink").click();
	await page.getByTestId("modal_close").click();
      
	// Scream now: We can't access the clipboard directly, but we can make a new page; paste into it; then read what the output was. 
	const temp_page = await context.newPage();
        await temp_page.setContent("<div data-testid=paste contenteditable></div>");
        await temp_page.getByTestId("paste").focus();
        await temp_page.keyboard.press("Control+KeyV");
        const invite_url = await temp_page.evaluate(() => document.querySelector("div").textContent);
        await temp_page.close();

	const call_name = await page.getByTestId("roomHeader_roomName").textContent();
        return { "response": "get_call_data", "data": { "videos": videos, "page_url": page_url, "invite_url": invite_url, "call_name": call_name}, "_upload_files": files };

    },

    "leave_call": async({ page } : { page: Page }) => {
        await page.getByTestId("incall_leave").click();
        return "left_call";
    },
    
    "set_mute": async({ page, data } : { page: Page , data: any}) => {
        const videoMuteGoal = data["video_mute"];
        // TODO: when we handle audio, handle audio muting in a similar way.
        //  const audioMuteGoal = data["audio_mute"];

        const videoMuted = await page.getByTestId("icon_videomute").isVisible();
        const videoUnmuted = await page.getByTestId("icon_video").isVisible();
	if (videoMuted == videoUnmuted) {
            throw Error(`VideoMute ${videoMuted} and Video ${videoUnmuted} icons are both visible or not visible.`);
        }
        if (videoUnmuted && videoMuteGoal) {
            await page.getByTestId("incall_videomute").click();
            await page.getByTestId("icon_videomute").waitFor();
	}
        else if (videoMuted && !videoMuteGoal) {
            await page.getByTestId("incall_videomute").click();
            await page.getByTestId("icon_video").waitFor();
	}
        else {
            console.log("Video state as requested, not clicking.");
        }
       return { "response": "video_mute_toggled", "data": { "was_video_muted": videoMuted } };
    },

    "start_screenshare": async ({ page }: { page: Page }) => {
       await page.getByTestId("incall_screenshare").click();
       return "started_screenshare";
    },
};
