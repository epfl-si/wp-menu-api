import {Site} from "../interfaces/site";
import {ErrorResult, MenuAPIResult} from "../interfaces/menuAPIResult";
import {SiteTreeReadOnly, SiteTreeInstance, SiteTreeMutable} from "../interfaces/siteTree";
import {WpMenu} from "../interfaces/wpMenu";
import {error, info, getErrorMessage, refresh_memory_array_size, total_WPV_sites} from "../utils/logger";

import * as fs from 'fs';
import {Config} from "../utils/configFileReader";

const headers: Headers = new Headers();
headers.set('Content-Type', 'application/json');
headers.set('Accept', 'application/json');

let restUrlEnd: string = '';
let openshiftEnv: string[] = [];
let wpVeritasURL: string = '';
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
    wpVeritasURL = configFile?.WPVERITAS_URL || 'https://wp-veritas.epfl.ch/api/v1/sites';
    protocolHostAndPort = configFile?.MENU_API_PROTOCOL_HOST_PORT || 'https://www.epfl.ch'; //TODO
    //info('Config: ', { wpVeritasURL: wpVeritasURL, openshiftEnv: openshiftEnv, protocolHostAndPort: protocolHostAndPort, method: 'configRefresh'});
}

function getSiteListFromWPVeritas(): Promise<Site[]> {
    info('Start getting wp-veritas sites', { url: wpVeritasURL, method: 'getSiteListFromWPVeritas'});
    const request: RequestInfo = new Request(wpVeritasURL, {
        method: 'GET',
        headers: headers
    });

    return fetch(request).then(res => res.json()).then(res => {
        const sites: Site[] = res;
        info(`End getting wp-veritas sites. Total sites: ${sites.length}`, { url: wpVeritasURL, method: 'getSiteListFromWPVeritas'});
        return sites;
    }).catch ((e) => {
        error(getErrorMessage(e), { url: wpVeritasURL, method: 'getSiteListFromWPVeritas'});
        return [];
    });
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
    info('Start getting menu from wp-veritas url', { url: siteMenuURL, method: 'getMenuForSite'});
    const request: RequestInfo = new Request(siteMenuURL, {
        method: 'GET',
        headers: headers
    });
    const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(reject.bind(null, new Error(siteMenuURL.concat(" - Timeout 10s"))), 10000);
    });

    return Promise.race([
        fetch(request).then((res) => res.json()).then((res) => res as MenuAPIResult),
        timeoutPromise
    ]).then((result) => {
        if (result.status && result.status === 'OK') {

            menus[lang].updateMenu(siteUrlSubstring, result);

            info('End getting menu from wp veritas url', { url: siteMenuURL, method: 'getMenuForSite'});
            return result;
        } else {
            error(JSON.stringify(result), { url: siteMenuURL, method: 'getMenuForSite'});
            throw new Error(siteMenuURL.concat(" - ").concat(result.status))
        }
    }).catch ((e) => {
        const message = getErrorMessage(e);
        console.log(e);
        error(message, { url: siteMenuURL, method: 'getMenuForSite'});

        const item: { [urlInstance : string]: WpMenu } | undefined = getArraySiteTreeByLanguage(lang)?.findItemByUrl(siteUrlSubstring);
        if (item) {

        }
        return new ErrorResult(siteMenuURL.concat(" - ").concat(message));
    });
}

export async function refreshMenu() {
    info('Start refresh from API', { method: 'refreshMenu'});
    const sites = await getSiteListFromWPVeritas();
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

export async function refreshFileMenu(pathRefreshFile: string) {
    info(`Start refresh from API`,{ method: 'refreshFileMenu'});
    await refreshMenu();

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
