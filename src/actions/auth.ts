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
        await page.getByTestId("usermenu_open").click(); 
        await page.getByTestId("usermenu_user").click();
        await page.getByTestId("profile_displayname").fill(data["display_name"]);
        return "set_display_name";
    }
};
