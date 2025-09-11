import {Site} from "../interfaces/site";
import {getRefreshErrorCount, info, menu_api_refresh_duration_seconds, resetRefreshErrorCount} from "../utils/logger";
import {Config} from "../utils/configFileReader";
import {getSiteListFromInventory} from "../utils/source";
import {getCategoriesCount, getPagesCount, getPostsCount, getRetrievedSitesCount} from "../utils/metrics";
import {MenuEntry} from "../interfaces/MenuEntry";
import {SiteTreeMutable} from "../interfaces/siteTree";
import {SiteTreeMutableByLanguage, SiteTreeReadOnlyByLanguage} from "../utils/siteTreeByLanguage";

const siteTreeMutableByLanguage: SiteTreeMutableByLanguage = new SiteTreeMutableByLanguage();
const siteTreeReadOnlyByLanguage: SiteTreeReadOnlyByLanguage = new SiteTreeReadOnlyByLanguage();
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
    let languages = await site.getLanguages();
    languages = Array.isArray(languages) ? languages : ["en"];
    for (const lang of languages) {
        allEntries.concat(await refreshEntries(site, lang));
    }
    return allEntries;
}

async function refreshEntries(site: Site, lang: string) {
    const entries = await site.getMenuEntries(lang);
    if (!siteTreeMutableByLanguage.menus[lang]) {
        siteTreeMutableByLanguage.menus[lang] = new SiteTreeMutable();
    }
    siteTreeMutableByLanguage.menus[lang].updateMenu(entries.siteMenuURL, entries.entries);
    return entries.entries;
}

export async function refreshMenu(sites: Site[]) {
    const startTime = new Date().getTime();
    info('Start refresh from API', { method: 'refreshMenu' });

    info(`Start getting menus in parallel. ${sites.length} sites.`,
      { method: 'refreshMenu' });
    await getMenusInParallel(sites, getMenuForSite, 10);

    info('End refresh from API', { method: 'refreshMenu' });
    const endTime = new Date().getTime();
    menu_api_refresh_duration_seconds.set((endTime - startTime)/1000)
}

export async function refreshFromAPI() {
    resetRefreshErrorCount();
    info(`Start refresh from API`,{ method: 'refreshFromAPI' });
    const sites = await getSiteListFromInventory(config);
    await refreshMenu(sites);
    refreshReadOnlyMenus();
    getRetrievedSitesCount(siteTreeReadOnlyByLanguage);
    getPagesCount(siteTreeReadOnlyByLanguage);
    getPostsCount(siteTreeReadOnlyByLanguage);
    getCategoriesCount(siteTreeReadOnlyByLanguage);
    info(`End refresh from API`, { method: 'refreshFromAPI' });
    return (getRefreshErrorCount() == 0 ? 200 : 500);
}

export async function refreshSingleMenu(url: string) {
    await getMenuForSite(new Site(url));
    refreshReadOnlyMenus();
    return 200;
}

function refreshReadOnlyMenus() {
    Object.keys(siteTreeMutableByLanguage.menus).forEach(lang => {
        info(`Start refresh readonly menus: ` + lang, { method: 'refreshReadOnlyMenus' });
        siteTreeReadOnlyByLanguage.menus[lang] = siteTreeMutableByLanguage.menus[lang].getReadOnlySiteTree();
        info(`End refresh readonly menus: ` + lang, { method: 'refreshReadOnlyMenus' });
    });
}

export function getSiteTreeReadOnlyByLanguage(): SiteTreeReadOnlyByLanguage {
    return siteTreeReadOnlyByLanguage;
}

export function getHomepageCustomLinks(lang: string) {
    return siteTreeReadOnlyByLanguage.menus[lang].getCustomMenus();
}

export function getExternalMenus(lang: string) {
    return siteTreeReadOnlyByLanguage.menus[lang].getExternalMenus();
}
