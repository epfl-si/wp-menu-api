import {Site} from "../interfaces/site";
import {ErrorResult, MenuAPIResult} from "../interfaces/menuAPIResult";
import {SiteTreeInstance, SiteTreeMutable} from "../interfaces/siteTree";
import {error, getErrorMessage, info, refresh_memory_array_size, total_WPV_sites} from "../utils/logger";
import {Config} from "../utils/configFileReader";
import {callWebService} from "../utils/webServiceCall";


let restUrlEnd: string = '';
let openshiftEnv: string[] = [];
let protocolHostAndPort: string = '';

const menus: {[lang: string]: SiteTreeMutable } = {
    fr: new SiteTreeMutable(),
    en: new SiteTreeMutable(),
    de: new SiteTreeMutable()
}

export function configRefresh(configFile: Config | undefined) {
    restUrlEnd = configFile?.REST_URL_END || 'wp-json/epfl/v1/menus/top?lang=';
    let  openshiftEnvFromConfig: string | undefined = configFile?.OPENSHIFT_ENV;
    if (openshiftEnvFromConfig) {
        openshiftEnv = openshiftEnvFromConfig.split('\n').filter(Boolean);
    } else {
        openshiftEnv = ["labs", "www"];
    }
    protocolHostAndPort = configFile?.MENU_API_PROTOCOL_HOST_PORT || 'https://www.epfl.ch';
}

async function getMenusInParallel(
    sites: Site[],
    lang: string,
    fn: (siteURL: string, language: string) => Promise<MenuAPIResult>, 
    threads = 10
): Promise<MenuAPIResult[]> {
    const result: MenuAPIResult[][] = [];
    const arr: Site[] = [];

    sites.forEach(s => arr.push(s));

    while (arr.length) {
        let subListOfSitesMenus: Promise<MenuAPIResult>[] = arr.splice(0, threads).map(x => fn(x.url, lang));
        const res: MenuAPIResult[] = await Promise.all(subListOfSitesMenus);
        result.push(res);
    }

    return result.flat();
}

async function getMenuForSite(siteURL: string, lang: string): Promise<MenuAPIResult> {
    if (protocolHostAndPort.indexOf('wp-httpd')>-1) {
        siteURL = siteURL.replace("http://wp-httpd.epfl.ch",protocolHostAndPort);
    }

    const siteMenuURL: string = siteURL.concat(restUrlEnd).concat(lang);
    const siteUrlSubstring = siteMenuURL.substring(siteMenuURL.indexOf(protocolHostAndPort)+protocolHostAndPort.length);
    const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(reject.bind(null, new Error("Timeout 10s")), 10000);
    });

    return Promise.race([
        callWebService(siteMenuURL, (url: string, res: any) => res as MenuAPIResult),
        timeoutPromise
    ]).then((result) => {
        if (result.status && result.status === 'OK') {
            menus[lang].updateMenu(siteUrlSubstring, result);
            info('End getting menu from wp veritas url', { url: siteMenuURL, method: 'getMenuForSite'});
            return result;
        } else {
            throw new Error(result.status);
        }
    }).catch ((e) => {
        const message = getErrorMessage(e);
        error(message, { url: siteMenuURL, method: 'getMenuForSite'});
        return new ErrorResult(siteMenuURL.concat(" - ").concat(message));
    });
}

export async function refreshMenu(sites: Site[]) {
    info('Start refresh from API', { method: 'refreshMenu'});
    const filteredListOfSites: Site[] = sites.filter(function (site){
        return openshiftEnv.includes(site.openshiftEnv);
    });

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

export async function refreshFileMenu(pathRefreshFile: string, sites: Site[]) {
    info(`Start refresh from API`,{ method: 'refreshFileMenu'});
    await refreshMenu(sites);

    menus['fr'].save(pathRefreshFile.concat('/menusFR.json'));
    menus['en'].save(pathRefreshFile.concat('/menusEN.json'));
    menus['de'].save(pathRefreshFile.concat('/menusDE.json'));
    info(`End refresh from API`,{ method: 'refreshFileMenu'});
}

export function readRefreshFile(pathRefreshFile: string)  {
    info('Start reading from file', { url: pathRefreshFile, method: 'readRefreshFile'});
    try {
        menus['fr'].load(pathRefreshFile.concat('/menusFR.json'));
        menus['en'].load(pathRefreshFile.concat('/menusEN.json'));
        menus['de'].load(pathRefreshFile.concat('/menusDE.json'));
    } catch (e) {
        error(getErrorMessage(e), { url: pathRefreshFile, method: 'readRefreshFile'});
    }
}

export function getArraySiteTreeByLanguage(lang: string): SiteTreeInstance | undefined {
    return menus[lang].getMenus();
}

export function getHomepageCustomLinks(lang: string) {
    return menus[lang].getCustomMenus();
}

export function getExternalMenus(lang: string) {
    return menus[lang].getExternalMenus();
}

export function checkMemoryArray() {
    refresh_memory_array_size.labels({arrayName: 'arrayMenusFR'}).set(menus['fr'].length);
    refresh_memory_array_size.labels({arrayName: 'arrayMenusDE'}).set(menus['de'].length);
    refresh_memory_array_size.labels({arrayName: 'arrayMenusEN'}).set(menus['en'].length);
}
