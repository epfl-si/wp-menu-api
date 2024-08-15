import {Site} from "../interfaces/site";
import {MenuAPIResult} from "../interfaces/menuAPIResult";
import {error, getErrorMessage, info, total_WPV_sites} from "../utils/logger";
import {Config} from "../utils/configFileReader";
import {callWebService} from "../utils/webServiceCall";
import {MenusCache} from "../utils/cache";
import {getSiteListFromWPVeritas} from "../utils/source";

let restUrlEnd: string = '';
let openshiftEnv: string[] = [];
let protocolHostAndPort: string = '';
const cachedMenus: MenusCache = new MenusCache();
let config: Config;

export function configRefresh(configFile: Config) {
    config = configFile;
    restUrlEnd = configFile.REST_URL_END;
    openshiftEnv = configFile.OPENSHIFT_ENV.split('\n').filter(Boolean);
    protocolHostAndPort = configFile.MENU_API_PROTOCOL_HOST_PORT;
}

async function getMenusInParallel(
    sites: Site[],
    lang: string,
    fn: (siteURL: string, osEnv: string, language: string) => Promise<MenuAPIResult>,
    threads = 10
): Promise<MenuAPIResult[]> {
    const result: MenuAPIResult[][] = [];
    const arr: Site[] = [];

    sites.forEach(s => arr.push(s));

    while (arr.length) {
        let subListOfSitesMenus: Promise<MenuAPIResult>[] = arr.splice(0, threads).map(x => fn(x.url, x.openshiftEnv, lang));
        const res: MenuAPIResult[] = await Promise.all(subListOfSitesMenus);
        result.push(res);
    }

    return result.flat();
}

async function getMenuForSite(siteURL: string, osEnv: string, lang: string): Promise<MenuAPIResult> {
    if (protocolHostAndPort.indexOf('wp-httpd')>-1) {
        siteURL = siteURL.replace("http://wp-httpd.epfl.ch",protocolHostAndPort);
    }

    const siteMenuURL: string = siteURL.concat(restUrlEnd).concat(lang);
    const siteUrlSubstring = siteMenuURL.substring(siteMenuURL.indexOf(protocolHostAndPort)+protocolHostAndPort.length);
    const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(reject.bind(null, new Error("Timeout 10s")), 10000);
    });

    return Promise.race([
        callWebService(config, false, siteMenuURL, osEnv, (url: string, res: any) => res as MenuAPIResult),
        timeoutPromise
    ]).then((result) => {
        if (result.status && result.status === 'OK') {
            cachedMenus.menus[lang].updateMenu(siteUrlSubstring, result);
            return result;
        } else {
            throw new Error(result.status);
        }
    }).catch ((e) => {
        const message = getErrorMessage(e);
        error(message, { url: siteMenuURL, method: 'getMenuForSite'});
        return {status: siteMenuURL.concat(" - ").concat(message), items: [],  _links: {}};
    });
}

export async function refreshMenu(sites: Site[]) {
    info('Start refresh from API', { method: 'refreshMenu'});
    const filteredListOfSites: Site[] = sites.filter(s => s.openshiftEnv!="");
    total_WPV_sites.labels({openshiftEnvironment: openshiftEnv.join('-')}).set(filteredListOfSites.length);

    info(`Start getting menus in parallel. ${filteredListOfSites.length} sites on the '${openshiftEnv}' openshift environment`,
      { method: 'refreshMenu'});
    const promises: Promise<MenuAPIResult[]>[] = [
        getMenusInParallel(filteredListOfSites, "en", getMenuForSite, 10),
        getMenusInParallel(filteredListOfSites, "fr", getMenuForSite, 10),
        getMenusInParallel(filteredListOfSites, "de", getMenuForSite, 10)
    ];

    await Promise.all(promises);
    info('End refresh from API', {method: 'refreshMenu'});
}

export async function refreshFileMenu(pathRefreshFile: string) {
    cachedMenus.read(pathRefreshFile);
    info(`Start refresh from API`,{ method: 'refreshFileMenu'});
    const sites = await getSiteListFromWPVeritas(config);
    await refreshMenu(sites);
    cachedMenus.write(pathRefreshFile);
    info(`End refresh from API`,{ method: 'refreshFileMenu'});
}

export function initializeCachedMenus(pathRefreshFile: string) {
    cachedMenus.read(pathRefreshFile);
}

export function getCachedMenus(): MenusCache {
    return cachedMenus;
}

export function getHomepageCustomLinks(lang: string) {
    return cachedMenus.menus[lang].getCustomMenus();
}

export function getExternalMenus(lang: string) {
    return cachedMenus.menus[lang].getExternalMenus();
}
