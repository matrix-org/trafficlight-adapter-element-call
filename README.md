# Element Call Adapter
[Trafficlight](https://github.com/matrix-org/trafficlight) adapter for [element-call](https://github.com/vector-im/element-call)!

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
## Starting trafficlight-adapter-element-call in Docker

We use docker as a simple way to isolate the browser from the various devices (so it doesn't try to use your webcam as an input); as well as have a simple stable setup that's repeatable.

This has a downside that we make it hard to see the chromium instance running within the docker container as it doesn't have access to the hosts' desktop. This is also good as part of it's task is to manipulate your clipboard to copy/paste, so this isn't a bad thing ^^


Run the docker containers in separate terminal windows / screen / tmux:
```
docker run -it ghcr.io/vector-im/trafficlight-adapter-element-call:main
```

You will want to run at least 3 of these to handle most TL tests.



# General notes

If you wish to run these against a local copy of element-call or trafficlight; you may need to set --network=host to gain access to eg, "http://localhost:4173", which is where element call runs by default, or http://localhost:5000/ where trafficlight runs. 

If you're wanting access to screenshots and videos before they're uploaded to trafficlight, you may wish to bind mount "/videos" to a location on your machine, for example `--mount type=bind,source=/home/michaelk/video-out,destination=/video`

If you're running the tests locally you may want to do the following in this order:

```
# run element-call on localhost, accessible from docker containers
work/element-call> yarn run serve --host
# start adapters in docker containers
work/trafficlight-adapter-element-call/compose> docker-compose up --daemon
# start trafficlight
work/trafficlight> QUART_APP=trafficlight venv/bin/quart run --host 0.0.0.0
```

Trafficlight will now run and exit when all tests are completed (reporting on stdout). The adapters can be left alone.

## Testing the adapter

Trafficlight as a while is a bit oversized for testing adapter changes. There are small python scripts that fake a trafficlight endpoint enough to test specific flows of the adapter; probably easier to use that than have to restart entire test cases in trafficlight repeatedly.

Try using `matrix-org/trafficlight`'s `adapter-manager/element-call-browser.py` for a quick example of this.

## Starting outside of docker

This is useful if you're testing changes to the adapter and want to see/interact with the browser as it happens.

You can start using `yarn run test:trafficlight`

However: note that this may not work for testing the camera management as running outside of docker means your laptops' camera etc will be available to the test. A bit of surgery to your video devices might be in order to prevent it loading the wrong ones. Or just accept the video images will be wrong (which is generally OK if you're just using this to test changes to the adapter, via the video manager. Make sure to smile during the screenshots!


