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

import fetch from "node-fetch";
import FormData = require("form-data");
import fs from "fs";
import * as crypto from "crypto";
import { BrowserContext, Page } from "playwright-core";
type PollData = {
    action: string;
    data: Record<string, any>;
};

type ActionCallback = (data?: Record<string, string>, client?: TrafficLightClient) => Promise<string | Record<string, any>>;

export class ActionMap {
    constructor(
        private readonly actionsObject: Record<string, ActionCallback> = {},
    ) {}

    on(action: string, callback: ActionCallback): void {
        if (this.actionsObject[action]) {
            throw new Error(`Action for "${action}" is already specified!`);
        }
        this.actionsObject[action] = callback;
    }

    off(action: string): void {
        if (!this.actionsObject[action]) {
            throw new Error(`Action "${action}" is not specified!`);
        }
        this.actionsObject[action] = undefined;
    }

    get(action: string): ActionCallback {
        return this.actionsObject[action];
    }

    get actions(): string[] {
        return Object.keys(this.actionsObject);
    }
}

export class TrafficLightClient {
    private uuid: string;

    constructor(
        private readonly trafficLightServerURL: string,
        private readonly page: Page,
        private readonly context: BrowserContext,
        protected readonly actionMap: ActionMap = new ActionMap(),
    ) {}

    protected async doRegister(type: string, data: Record<string, string>): Promise<void> {
        this.uuid = crypto.randomUUID();
        console.log(`Registering trafficlight client ${ this.uuid } ...`);
        const body = JSON.stringify({
            type,
            ...data,
        });
        const target = `${this.trafficLightServerURL}/client/${this.uuid}/register`;
        const response = await fetch(target, {
            method: "POST",
            body,
            headers: { "Content-Type": "application/json" },
        });
        if (response.status != 200) {
           const text = await response.text();
            throw new Error(`Unable to register client, got ${ response.status } ${ text } from server`);
        } else {
            console.log(`Registered to trafficlight as ${this.uuid}`);
        }
    }

    async start() {
        let p1, p2;
        try {
            while (true) {
                const pollResponse = await fetch(this.pollUrl);
                if (pollResponse.status !== 200) {
                    throw new Error(`poll failed with ${pollResponse.status}`);
                }
                const pollData = await pollResponse.json() as PollData;
                console.log(`* Trafficlight asked to execute action "${pollData.action}", `
                           +`data = ${JSON.stringify(pollData.data)}:`);
                if (pollData.action === "login" && !p1) {
                    p1 = performance.now();
                }
                let result: Awaited<ReturnType<ActionCallback>>;
                try {
                    const { action, data } = pollData;
                    const callback = this.actionMap.get(action);
                    if (!callback) {
                        console.log("\tWARNING: unknown action ", action);
                        continue;
                    }
                    console.log(`\tAction for "${action}" found in action-map  ✔`);
                    result = await callback(data, this);
                } catch (err) {
                    console.error("\tERROR: error when performing action. Taking screenshot", err);
                    try {
                        await this.page.screenshot({ "path": "error_snapshot.png" } );
                        await this.context.close();
                    } catch (screen_err) {
                        console.error(screen_err);
                    }
                    result = "error";
                }
                if (pollData.action === "exit") {
                    p2 = performance.now();
                    console.log("Total time for login --> complete is", p2 - p1);
                    return;
                }
                if (result) {
                    var body;
                    if (typeof result === "string") {
                        // wrap in small json body
                        body = JSON.stringify({ response: result });
                    } else  {
                        body = JSON.stringify( result );
                        // TODO: extract this upload into a method call.
                        // also use this extracted method to upload logs and video on exit.
                        // TODO: refactor this into processing a tuple returned from the call.
                        // optional map of str -> str on the response
                        const files = result["_upload_files"];
                        if (files) {
                            for (var file in files) {
                                const formData = new FormData();
                                const filestream = fs.createReadStream(file);
                                formData.append("file", filestream, { contentType: "application/octet-stream", filename: file });
                                const fileResponse = await fetch(this.uploadUrl, {
                                    method: "POST",
                                    body: formData
                                });
                                // At the moment we don't care if we fail to upload
                                // as the trafficlight server will proceed to error out
                                // afterwards because it doesn't have the files it needs.
                                console.log(`Uploaded ${file} with response ${ fileResponse.status}`);

                            }
                        }
                    }

                    
                    const respondResponse = await fetch(this.respondUrl, {
                        method: "POST",
                        body, 
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                        },
                    });
                    if (respondResponse.status !== 200) {
                        throw new Error(`respond failed with ${respondResponse.status}`);
                    }
                }
            }
        } finally {
            console.log("Should close context here if we had a reference");
            this.context.close();
        }
    }

    on(action: string, callback: ActionCallback): void {
        this.actionMap.on(action, callback);
    }

    off(action: string): void {
        this.actionMap.off(action);
    }

    get clientBaseUrl(): string {
        return `${this.trafficLightServerURL}/client/${encodeURIComponent(this.uuid)}`;
    }
    get pollUrl() {
        return `${this.clientBaseUrl}/poll`;
    }

    get uploadUrl() {
        return `${this.clientBaseUrl}/upload`;
    }

    get respondUrl() {
        return `${this.clientBaseUrl}/respond`;
    }
}
