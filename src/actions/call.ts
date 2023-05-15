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
        const muted = await page.getByTestId("videoTile_muted").count() != 0;
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
        return { "response": "get_lobby_data", "data": { "muted": muted, "snapshot": snapshot_name, "page_url": page_url, "invite_url": invite_url, "call_name": call_name }, "_upload_files": files };

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
            
            const caption = await video.getByTestId("videoTile_caption").textContent();
            const muted = await video.getByTestId("videoTile_muted").count() != 0;
            const snapshot_name = `snapshot_video_${call_data_request}_${i}.png`;
            await video.getByTestId("videoTile_video").screenshot({ path: snapshot_name });
            // permit indirect mapping of name to filename, if needed.
            files[snapshot_name] = snapshot_name;
            videos.push({caption: caption, muted: muted, snapshot: snapshot_name});
        }

        const page_url = page.url();

	// Open the settings menu and click the invite link
	await page.getByTestId("call_more").click();
	await page.getByTestId("call_moreInvite").click();
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
    
    "set_video_mute": async({ page, data } : { page: Page , data: any}) => {
        const videoIcon = page.getByTestId("incall_videomute");
        const nestedSvg = page.locator("xpath=//svg/path");
        const svg_fill = await videoIcon.locator(nestedSvg).first().getAttribute("fill");
        let current_mute;
	if (svg_fill == "white") {
            current_mute = true;
        } else if (svg_fill == "#394049") {
            current_mute = false;
        } else {
            throw Exception("unable to determine mute-ness of the call");
        }

	if ((current_mute && data["video_mute"] == "false") || (
	    !current_mute && data["video_mute"] == "true")) {
            await page.getByTestId("incall_videomute").click();
        }
            else {
                console.log("Video muted; leaving alone")
            }
       return { "response": "video_mute_toggled", "data": { "previously_muted": current_mute } };
    },

    "start_screenshare": async ({ page }: { page: Page }) => {
       await page.getByTestId("incall_screenshare").click();
       return "started_screenshare";
    },
};
