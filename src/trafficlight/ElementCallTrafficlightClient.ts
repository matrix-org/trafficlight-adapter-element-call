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
import { BrowserContext, Page} from "playwright"; 

export class ElementCallTrafficlightClient extends TrafficLightClient {
    constructor(trafficLightServerURL: string, page: Page, context: BrowserContext) {
        super(trafficLightServerURL, page, context);
    }

    async register(): Promise<void> {
        await super.doRegister("element-call", {
            version: "UNKNOWN",
        });
    }


    get availableActions(): string[] {
        return this.actionMap.actions;
    }
}
