import { Page }  from "playwright";

module.exports = {
    "register": async ({ page, data }: { page: Page, data: any }) => {
        await page.getByTestId("home_register").click(); 
        await page.getByTestId("register_username").fill(data["localpart"]);
        await page.getByTestId("register_password").fill(data["password"]);
        await page.getByTestId("register_confirm_password").fill(data["password"]);
        await page.getByTestId("register_register").click();

        return "registered";
    },
    "login": async ({ page, data }: { page: Page, data: any }) => {
        await page.getByTestId("home_login").click(); 
        await page.getByTestId("login_username").fill(data["localpart"]);
        await page.getByTestId("login_password").fill(data["password"]);
        await page.getByTestId("login_login").click();
        return "loggedin";
    },
    "logout": async ({ page }: { page: Page, data: any }) => {
        await page.getByTestId("usermenu_open").click();
        await page.getByTestId("usermenu_logout").click();
        return "logged_out";
    },
    "set_display_name": async ({ page, data }: { page: Page, data: any }) => {
        // prefer usermenu over incall_settings.
        const usermenu_promise = page.getByTestId("usermenu_open").waitFor().then(() => { return true ;});
        const incall_settings_promise = page.getByTestId("incall_settings").waitFor().then(() => { return false; });
        const usermenu =  await Promise.race([
            usermenu_promise,
            incall_settings_promise
        ]);
        if (usermenu) {
        // if out of call:
            await page.getByTestId("usermenu_open").click(); 
            await page.getByTestId("usermenu_user").click();
	} else {
        // if in call:
            await page.getByTestId("incall_settings").click();
        }
        await page.getByTestId("tab_profile").click();
        await page.getByTestId("profile_displayname").fill(data["display_name"]);
        await page.getByTestId("modal_close").click(); 
        return "set_display_name";
    }
};
