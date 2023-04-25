# Element Call Adapter
[Trafficlight](https://github.com/matrix-org/trafficlight) adapter for [element-call](https://github.com/vector-im/element-call)!

At the moment, this is a work in progress to see if we can use trafficlight to test element call.

## V4L2loopback requirements

We want to be able to manage input video into the chrome instance started by playwright.

We do so by starting this process with reference to a v4l2loopback device; and require ffmpeg to be available on the system.

We then have commands that update a specific image file which then turns into updates to the video stream controlled by the test framework.

## Running
---
```bash
yarn install
yarn test:trafficlight
```

## Adding new actions
---
This adapter will pickup any actions defined in `.ts` files from `src/actions`.

To define a new set of actions (eg: relating to settings):
1. Create a new file in `src/actions` (say settings.ts, any name is fine).
2. Export an object as follows:
    ```ts
    import { Page }  from "playwright";
    import { Browser } from "playwright";
    import { BrowserContext } from "playwright";

    type Args = {
        page: Page;
        data: any;
        browser: Browser;
        context: BrowserContext;
    };

    module.exports = {
        "my-action-1": async ({context, browser, data, page}: Args) => {
            // Logic for your actions
            // await page.selector("#matrix-foo).click();
        },
        "my-action-2": async ({context, browser, data, page}: Args) => {
            // Logic for your actions
            // await page.selector("#matrix-foo).click();
        },
    };
    ```
3. Run the adapter, and look at the output to see if your actions were picked up:
    ```
    The following actions were found:
    login, logout, enable_dehydrated_device, idle, wait, exit, reload, clear_idb_storage, create_room, open_room, accept_invite, send_message, verify_message_in_timeline, verify_last_message_is_utd
    ```
## Testing against trafficlight

Trafficlight is a bit oversized for testing adapter changes. There are small python scripts that fake a trafficlight endpoint enough to test specific flows of the adapter; probably easier to use that than have to restart entire test cases in trafficlight repeatedly.
