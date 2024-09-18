import {Site} from "../interfaces/site";
import {info, menu_api_refresh_duration_seconds} from "../utils/logger";
import {Config} from "../utils/configFileReader";
import {MenusCache} from "../utils/cache";
import {getSiteListFromWPVeritas} from "../utils/source";
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
    fn: (site: Site) => Promise<MenuEntry[]>,
    threads = 10
) {
    while (sites.length) {
        let subListOfSitesMenus: Promise<MenuEntry[]>[] = sites.splice(0, threads).map(x => fn(x));
        await Promise.all(subListOfSitesMenus);
    }
}

async function getMenuForSite(site: Site): Promise<MenuEntry[]> {
    const allEntries: MenuEntry[] = []
    const languages = await site.getLanguages();
    for (const lang of languages) {
        const entries = await site.getMenuEntries(lang);
        allEntries.concat(entries.entries);
        if (!cachedMenus.menus[lang]) {
            cachedMenus.menus[lang] = new SiteTreeMutable();
        }
        cachedMenus.menus[lang].updateMenu(entries.siteMenuURL, entries.entries);
    }
    return allEntries;
}

export async function refreshMenu(sites: Site[]) {
    const startTime = new Date().getTime();
    info('Start refresh from API', { method: 'refreshMenu' });
    const filteredListOfSites: Site[] = sites.filter(s => s.openshiftEnv!="" && s.wpInfra);
    getWPVeritasSitesForEnvironment(filteredListOfSites);

    info(`Start getting menus in parallel. ${filteredListOfSites.length} sites.`,
      { method: 'refreshMenu' });
    await getMenusInParallel(filteredListOfSites, getMenuForSite, 10);

    info('End refresh from API', { method: 'refreshMenu' });
    const endTime = new Date().getTime();
    menu_api_refresh_duration_seconds.set((endTime - startTime)/1000)
}

export async function refreshFileMenu(pathRefreshFile: string) {
    cachedMenus.read(pathRefreshFile);
    info(`Start refresh from API`,{ method: 'refreshFileMenu' });
    const sites = await getSiteListFromWPVeritas(config);
    await refreshMenu(sites);
    cachedMenus.write(pathRefreshFile);
    getRetrievedSitesCount(cachedMenus);
    getPagesCount(cachedMenus);
    getPostsCount(cachedMenus);
    getCategoriesCount(cachedMenus);
    info(`End refresh from API`, { method: 'refreshFileMenu' });
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
