/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { spawn } from "child_process";
import { copyFile } from "fs/promises";
import playwright from "playwright";
import { ElementCallTrafficlightClient } from "./trafficlight";
import trafficlightConfig from "../trafficlight.config.json";
import { addActionsToClient } from "./populate";

async function start() {
    console.log("Starting Element Call trafficlight adapter");
    const headless = process.env.HEADLESS == "true" || false;
    await beginffmpeg(process.env.TRAFFICLIGHT_LOOPBACK_DEVICE || trafficlightConfig["v4l2loopback-device"]);
    const playwrightObjects = await getPlaywrightPage(headless);
    const { page } = playwrightObjects;

    const trafficlightUrl = process.env.TRAFFICLIGHT_URL || "http://127.0.0.1:5000";
    const client = new ElementCallTrafficlightClient(trafficlightUrl);
    await addActionsToClient(client, playwrightObjects);
    console.log("\nThe following actions were found:\n", client.availableActions.join(", "));
    await client.register();
    try {
        client.start();
        const elementCallURL = process.env["BASE_APP_URL"] ?? trafficlightConfig["element-call-instance-url"];
        // There's a disconnect that happens after you register, not sure how to properly fix this (?)
        // so block for 3 seconds as a temp fix
        await new Promise(r => setTimeout(r, 3000));
        await page.goto(elementCallURL);
    }
    catch (e) {
        console.error(e);
    }
}


/*
This function requires a /dev/video device created by v4l2loopback that ffpmeg can
blat images into.

For this version, we repeatedly send a given png/jpg into the video stream so you can
see a static image there.

I have successfully created one of these by this method:

Exclusive_caps is required for chrome to be happy with the video feed
Firefox is happy without that, but is also happy with it.

I believe devices can be up to 10; in that case video_nr, exclusive_caps, card_label require to be 
a comma separated list of the options for each device (eg devices=2 video_nr=11,12 exclusive_caps=1,1 card_label=X_11,X_12) and so on.

We assume chrome is able to only see the one video feed, rather than rely on selecting it. Though potentially later tests can check we handle multiple cameras correctly, etc.

# modprobe videodev
# MODULE_OPTIONS="devices=1 video_nr=11 exclusive_caps=1 card_label=X_11"
# modprobe v4l2loopback $MODULE_OPTIONS


I'm having problems with something not tidying up cleanly after the 

*/
async function beginffmpeg(v4l2loopbackDevice:string) {
    // setup initial file correctly. 
    copyFile("video/images/initial.png", "video/images/target.png");
    const ffmpeg = "/usr/bin/ffmpeg";
    const args = ["-loglevel", "warning", "-cpucount", "1", "-re", "-framerate", "1", "-loop", "1", "-i", "video/images/target.png", "-vf", "format=yuv420p", "-fpsmax", "1", "-f", "v4l2", v4l2loopbackDevice];
    console.log(`Spawning ${ffmpeg} ${args}`);
    const childProcess = spawn(ffmpeg, args);
    
    childProcess.stdout.on("data", (data) => {
        console.log(`ffmpeg(stdout): ${data}`);
    });
    childProcess.stderr.on("data", (data) => {
        console.log(`ffmpeg(stderr): ${data}`);
    });
    childProcess.on("close", (code) => { 
        console.log(`ffmpeg exit with ${code}`);
    });
    childProcess.on("error", (err) => {
        console.log(`ffmpeg launch error ${err}`);
    });
    return childProcess;
}

async function getPlaywrightPage(headless:boolean) {
    const browser = await playwright.chromium.launch({headless: headless, args:  [
//        '--use-fake-device-for-media-stream',
//        '--use-file-for-fake-video-capture=/home/michaelk/work/trafficlight-adapter-element-call/video/video.mjpeg'
//          '--auto-select-desktop-capture-source=Element Call'
          "--auto-select-tab-capture-source-by-title=BBC"
    ]
    });
    const context = await browser.newContext();
    context.grantPermissions(["microphone","camera"]);
    const page = await context.newPage();
    const screenshare_page = await context.newPage();
    screenshare_page.goto("https://bbc.co.uk/");
    return {browser, context, page};
}

start();
