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
    const ffmpeg = await beginffmpeg(process.env.TRAFFICLIGHT_LOOPBACK_DEVICE);
    const playwrightObjects = await getPlaywrightPage(headless);
    const { browser, context } = playwrightObjects;
    const trafficlightUrl = process.env.TRAFFICLIGHT_URL || "http://127.0.0.1:5000";
    const elementCallURL = process.env["BASE_APP_URL"] ?? trafficlightConfig["element-call-instance-url"];
    const elementCallType = process.env["BASE_APP_TYPE"] ?? trafficlightConfig["element-call-instance-type"];
    const client = new ElementCallTrafficlightClient(trafficlightUrl, context, browser, elementCallURL);
    await addActionsToClient(client);
    console.log("\nThe following actions were found:\n", client.availableActions.join(", "));
    await client.register(elementCallType);
    try {
        await client.newPage();
        const promise = client.start();
        // There's a disconnect that happens after you register, not sure how to properly fix this (?)
        // so block for 3 seconds as a temp fix
        await new Promise(r => setTimeout(r, 3000));
        const mediaDevices = await client.page.evaluate(async () => {return await navigator.mediaDevices.enumerateDevices();});
        console.log(mediaDevices);
	await promise;
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.uploadPageVideo();
        ffmpeg.kill();
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

    // TODO: refactor this to create and use a temporary file
    // passing that location into "actions/video.ts" for updates
    copyFile("video/images/initial.png", "video/images/target0.png");
    copyFile("video/images/initial.png", "video/images/target1.png");
    const ffmpeg = "/usr/bin/ffmpeg";
    const args = ["-loglevel", "warning", "-stream_loop", "-1", "-r", "1","-re", "-i", "video/images/target%01d.png", "-vf", "realtime,format=yuv420p", "-f", "v4l2", v4l2loopbackDevice];
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

    await new Promise(f => setTimeout(f, 5000));
    return childProcess;
}

async function getPlaywrightPage(headless:boolean) {
    
    const browser = await playwright.chromium.launch({headless: headless,
         args:  [
          "--auto-select-tab-capture-source-by-title=BBC",
          "--enable-logging",
          "--log-file=/video/chrome.log"
    ]
    });
    const context = await browser.newContext({ recordVideo: { "dir": "/video" } });
    context.grantPermissions(["microphone","camera"]);

    // const screenshare_page = await context.newPage();
    // await screenshare_page.goto("https://trafficlight/utilties/screenshare_page.htm");
    return {browser, context};
}

start();
