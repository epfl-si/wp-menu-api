import {MenuEntry} from "./MenuEntry";
import {callWebService} from "../utils/webServiceCall";
import {
    error,
    getErrorMessage,
    increaseRefreshErrorCount,
    info,
    menu_api_wp_api_call_duration_seconds
} from "../utils/logger";
import {Config} from "../utils/configFileReader";

let config: Config;

export function configSite(configFile: Config) {
    config = configFile;
}

export class Site {
    url: string;

    constructor (url : string) {
        this.url = url;
    }
    getUrl() : string {
        return this.url;
    }

    getDomainUrl() : string {
        const parsedURL = new URL(this.url);
        return 'https://' + parsedURL.hostname;
    }

    async getLanguages(): Promise<string[]> {
        try {
            return await callWebService(config, `${this.url}/wp-json/epfl/v1/languages`, callBackFunctionForLanguages)
        } catch (e) {
            increaseRefreshErrorCount();
            error(getErrorMessage(e), { url: `${this.url}/wp-json/epfl/v1/languages` });
            return [];
        }
    }

    async getMenuEntries(lang: string): Promise<{ siteMenuURL: string, entries: MenuEntry[] }> {
        const startTime = new Date().getTime();
        const siteMenuURL: string = `${this.url}/wp-json/epfl/v1/menus/top?lang=${lang}`;
        const timeoutPromise = new Promise<never>((resolve, reject) => {
            setTimeout(reject.bind(null, new Error("Timeout 10s")), 10000);
        });

        const res: Promise<{siteMenuURL: string, entries : MenuEntry[]}> = Promise.race([
            callWebService(config, siteMenuURL, (url: string, res: any) => res as any),
            timeoutPromise
        ]).then((menusApiResponse) => {
            if (menusApiResponse.status && menusApiResponse.status === 'OK') {
                return {siteMenuURL: siteMenuURL, entries: menusApiResponse.items.map((m: any) => MenuEntry.parse(this, m))};
            } else {
                throw new Error(menusApiResponse.status);
            }
        }).catch ((e) => {
            increaseRefreshErrorCount();
            const message = getErrorMessage(e);
            error(message, { url: siteMenuURL });
            return {siteMenuURL: siteMenuURL, entries: []};
        });
        const endTime = new Date().getTime();
        menu_api_wp_api_call_duration_seconds.labels({url: siteMenuURL, lang: lang}).set((endTime - startTime)/1000);

        return res;
    }
}

function callBackFunctionForLanguages(url: string, res: any){
    info(`Languages retrieved for site: ${res}`, { url: url, method: 'callBackFunctionForLanguages' });
    return res;
}
