import {Site} from "../interfaces/site";
import {getRefreshErrorCount, info, menu_api_refresh_duration_seconds, resetRefreshErrorCount} from "../utils/logger";
import {Config} from "../utils/configFileReader";
import {MenusCache} from "../utils/cache";
import {getOpenshift4PodName, getSiteListFromInventory} from "../utils/source";
import {
    getCategoriesCount,
    getPagesCount,
    getPostsCount,
    getRetrievedSitesCount,
    getWPVeritasSitesForEnvironment
} from "../utils/metrics";
import {MenuEntry} from "../interfaces/MenuEntry";
import {SiteTreeMutable} from "../interfaces/siteTree";

const cachedMenus: MenusCache = new MenusCache();
let config: Config;

export function configRefresh(configFile: Config) {
    config = configFile;
}

async function getMenusInParallel(
    sites: Site[],
    podName: string,
    fn: (site: Site, podName: string) => Promise<MenuEntry[]>,
    threads = 10
) {
    while (sites.length) {
        let subListOfSitesMenus: Promise<MenuEntry[]>[] = sites.splice(0, threads).map(x => fn(x, podName));
        await Promise.all(subListOfSitesMenus);
    }
}

async function getMenuForSite(site: Site, podName: string): Promise<MenuEntry[]> {
    const allEntries: MenuEntry[] = []
    let languages = await site.getLanguages(podName);
    languages = Array.isArray(languages) ? languages : ["en"];
    for (const lang of languages) {
        const entries = await site.getMenuEntries(lang, podName);
        allEntries.concat(entries.entries);
        if (!cachedMenus.menus[lang]) {
            cachedMenus.menus[lang] = new SiteTreeMutable();
        }
        cachedMenus.menus[lang].updateMenu(entries.siteMenuURL, entries.entries);
    }
    return allEntries;
}

export async function refreshMenu(sites: Site[], podName: string) {
    const startTime = new Date().getTime();
    info('Start refresh from API', { method: 'refreshMenu' });
    const filteredListOfSites: Site[] = sites.filter(s => s.openshiftEnv!="" && s.wpInfra);
    getWPVeritasSitesForEnvironment(filteredListOfSites);

    info(`Start getting menus in parallel. ${filteredListOfSites.length} sites.`,
      { method: 'refreshMenu' });
    await getMenusInParallel(filteredListOfSites, podName, getMenuForSite, 10);

    info('End refresh from API', { method: 'refreshMenu' });
    const endTime = new Date().getTime();
    menu_api_refresh_duration_seconds.set((endTime - startTime)/1000)
}

export async function refreshFileMenu(pathRefreshFile: string) {
    cachedMenus.read(pathRefreshFile);
    return await refreshFromAPI(pathRefreshFile);
}

export async function refreshFromAPI(pathRefreshFile: string) {
    resetRefreshErrorCount();
    const podName = await getOpenshift4PodName();
    info(`Start refresh from API`,{ method: 'refreshFileMenu' });
    const sites = await getSiteListFromInventory(config, podName);
    await refreshMenu(sites, podName);
    cachedMenus.write(pathRefreshFile);
    getRetrievedSitesCount(cachedMenus);
    getPagesCount(cachedMenus);
    getPostsCount(cachedMenus);
    getCategoriesCount(cachedMenus);
    info(`End refresh from API`, { method: 'refreshFileMenu' });
    return (getRefreshErrorCount() == 0 ? 200 : 500);
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
