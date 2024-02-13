import {Site} from "../interfaces/site";
import {Request} from "express";
import {ErrorResult, MenuAPIResult} from "../interfaces/menuAPIResult";
import {SiteTree, SiteTreeInstance} from "../interfaces/siteTree";
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

let arrayMenusFR: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];
let arrayMenusEN: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];
let arrayMenusDE: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];
const arrayCustomLinkFR: { urlInstanceRestUrl: string, entries: WpMenu }[] = [];
const arrayCustomLinkEN: { urlInstanceRestUrl: string, entries: WpMenu }[] = [];
const arrayCustomLinkDE: { urlInstanceRestUrl: string, entries: WpMenu }[] = [];
const arrayExternalMenusFR: { urlInstanceRestUrl: string, entries: WpMenu }[] = [];
const arrayExternalMenusEN: { urlInstanceRestUrl: string, entries: WpMenu }[] = [];
const arrayExternalMenusDE: { urlInstanceRestUrl: string, entries: WpMenu }[] = [];

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
    info('Start getting menu from wp-veritas url', { url: siteMenuURL, method: 'getMenuForSite'});
    const request: RequestInfo = new Request(siteMenuURL, {
        method: 'GET',
        headers: headers
    });
    const timeoutPromise = new Promise<MenuAPIResult>(resolve => {
        setTimeout(resolve.bind(null, new ErrorResult(siteMenuURL.concat(" - Timeout 10s"))), 10000);
    });

    return Promise.race([
        fetch(request).then((res) => res.json()).then((res) => res as MenuAPIResult),
        timeoutPromise
    ]).then((result) => {
        if (result.status && result.status === 'OK') {
            const siteUrlSubstring = siteMenuURL.substring(siteMenuURL.indexOf(protocolHostAndPort)+protocolHostAndPort.length);

            setArrayResultsByLang(lang, result, siteUrlSubstring);

            info('End getting menu from wp veritas url', { url: siteMenuURL, method: 'getMenuForSite'});
            return result;
        } else {
            error(JSON.stringify(result), { url: siteMenuURL, method: 'getMenuForSite'});
            return new ErrorResult(siteMenuURL.concat(" - ").concat(result.status));
        }
    }).catch ((e) => {
        const message = getErrorMessage(e);
        error(message, { url: siteMenuURL, method: 'getMenuForSite'});

        return new ErrorResult(siteMenuURL.concat(" - ").concat(message));
    });
}

function setArrayResultsByLang(lang: string, result: MenuAPIResult, siteUrlSubstring: string) {
    switch ( lang ) {
        case "fr":
            arrayMenusFR.push( { urlInstanceRestUrl: siteUrlSubstring, entries: result.items } );
            if(result.items[0].object==='custom') {
                arrayCustomLinkFR.push( { urlInstanceRestUrl: siteUrlSubstring, entries: result.items[0] } );
            }
            result.items.forEach(item => {
                if(item.object==='epfl-external-menu') {
                    arrayExternalMenusFR.push( { urlInstanceRestUrl: siteUrlSubstring, entries: item } );
                }
            });
            break;
        case "de":
            arrayMenusDE.push( { urlInstanceRestUrl: siteUrlSubstring, entries: result.items } );
            if(result.items[0].object==='custom') {
                arrayCustomLinkDE.push( { urlInstanceRestUrl: siteUrlSubstring, entries: result.items[0] } );
            }
            result.items.forEach(item => {
                if(item.object==='epfl-external-menu') {
                    arrayExternalMenusDE.push( { urlInstanceRestUrl: siteUrlSubstring, entries: item } );
                }
            });
            break;
        default: //en
            arrayMenusEN.push( { urlInstanceRestUrl: siteUrlSubstring, entries: result.items } );
            if(result.items[0].object==='custom') {
                arrayCustomLinkEN.push( { urlInstanceRestUrl: siteUrlSubstring, entries: result.items[0] } );
            }
            result.items.forEach(item => {
                if(item.object==='epfl-external-menu') {
                    arrayExternalMenusEN.push( { urlInstanceRestUrl: siteUrlSubstring, entries: item } );
                }
            });
            break;
    }
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

export async function refreshFileMenu(pathRefreshFile: string, withRefreshMemory: boolean) {
    info(`Start writing files ${withRefreshMemory ? 'after doing refresh from API' : 'without doing refresh from API'}`,
      { method: 'refreshFileMenu'});
    if (withRefreshMemory) {
        await refreshMenu();
    }

    writeRefreshFile(pathRefreshFile.concat('/menusFR.json'),JSON.stringify(arrayMenusFR));
    writeRefreshFile(pathRefreshFile.concat('/menusEN.json'),JSON.stringify(arrayMenusEN));
    writeRefreshFile(pathRefreshFile.concat('/menusDE.json'),JSON.stringify(arrayMenusDE));
    info(`End writing files ${withRefreshMemory ? 'after doing refresh from API' : 'without doing refresh from API'}`,
      { method: 'refreshFileMenu'});
}

function writeRefreshFile(path: string, json: string)  {
    try {
        fs.writeFile(path, json, (err) => {
            if (err) {
                error(getErrorMessage(err), { url: path, method: 'writeRefreshFile'});
            } else {
                info('Successfully wrote file', { url: path, method: 'writeRefreshFile'});
            }
        });
    } catch (e) {
        error(getErrorMessage(e), { url: path, method: 'writeRefreshFile'});
    }
}

export function readRefreshFile(pathRefreshFile: string)  {
    info('Start reading from file', { url: pathRefreshFile, method: 'readRefreshFile'});
    try {
        const menusFR = fs.readFileSync(pathRefreshFile.concat('/menusFR.json'), 'utf8');
        arrayMenusFR = JSON.parse(menusFR);
        const menusEN = fs.readFileSync(pathRefreshFile.concat('/menusEN.json'), 'utf8');
        arrayMenusEN = JSON.parse(menusEN);
        const menusDE = fs.readFileSync(pathRefreshFile.concat('/menusDE.json'), 'utf8');
        arrayMenusDE = JSON.parse(menusDE);
    } catch (e) {
        error(getErrorMessage(e), { url: pathRefreshFile, method: 'readRefreshFile'});
    }
}

export function getArraySiteTreeByLanguage(lang: string): SiteTreeInstance | undefined {
    let siteArray: SiteTreeInstance;

    switch ( lang ) {
        case "fr":
            siteArray = SiteTree(arrayMenusFR);
            break;
        case "de":
            siteArray = SiteTree(arrayMenusDE);
            break;
        default: //en
            siteArray = SiteTree(arrayMenusEN);
            break;
    }

    return siteArray;
}

export function getHomepageCustomLinks(lang: string) {
    switch ( lang ) {
        case "fr":
            return arrayCustomLinkFR;
        case "de":
            return arrayCustomLinkDE;
        default: //en
            return arrayCustomLinkEN;
    }
}

export function getExternalMenus(lang: string) {
    switch ( lang ) {
        case "fr":
            return arrayExternalMenusFR;
        case "de":
            return arrayExternalMenusDE;
        default: //en
            return arrayExternalMenusEN;
    }
}

export function checkMemoryArray() {
    refresh_memory_array_size.labels({arrayName: 'arrayMenusFR'}).set(arrayMenusFR.length);
    refresh_memory_array_size.labels({arrayName: 'arrayMenusDE'}).set(arrayMenusDE.length);
    refresh_memory_array_size.labels({arrayName: 'arrayMenusEN'}).set(arrayMenusEN.length);
}
