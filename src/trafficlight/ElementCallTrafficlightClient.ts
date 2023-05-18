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

import { TrafficLightClient } from "./TrafficLightClient";
import { Browser, BrowserContext } from "playwright"; 

export class ElementCallTrafficlightClient extends TrafficLightClient {
    private offset = 0;
    constructor(
        trafficLightServerURL: string, context: BrowserContext, browser: Browser, private readonly elementCallURL: string
    ) {
        super(trafficLightServerURL, context, browser);
    }

    async register(version: string, url: string): Promise<void> {
        await super.doRegister("element-call", {
            version: version,
            url: url
        });
    }


    get availableActions(): string[] {
        return this.actionMap.actions;
    }

    async uploadPageVideo() {
        const upload_name = `screencast_${this.offset}.webm`;
        return this.uploadFile(await this.page.video().path(), upload_name);
    }

    async newPage() {
	if (this.page) {
            await this.uploadPageVideo();
        }
        const new_page = await this.context.newPage();
        const prefix = "PP"+(this.offset++)+": ";
        new_page.on("console", msg => console.log(prefix + msg.text()));
        await new_page.goto(this.elementCallURL);
        this.page = new_page;
    }
}
