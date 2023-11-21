import {Site} from "../interfaces/site";
import {Request} from "express";
import {ErrorResult, MenuAPIResult} from "../interfaces/menuAPIResult";
import {SiteTree, SiteTreeInstance} from "../interfaces/siteTree";
import {WpMenu} from "../interfaces/wpMenu";
import fs from 'fs';
import {error, info} from "../utils/logger";


const headers: Headers = new Headers();
headers.set('Content-Type', 'application/json');
headers.set('Accept', 'application/json');

const restUrlEnd: string = 'wp-json/epfl/v1/menus/top?lang=';
const openshiftEnv: string[] = JSON.parse(process.env.OPENSHIF_ENV || '["rmaggi"]');
const wpVeritasURL: string = process.env.WPVERITAS_URL || 'https://wp-veritas-test.epfl.ch/api/v1/sites';
const protocolHostAndPort: string = process.env.MENU_API_PROTOCOL_HOST_PORT || 'http://wp-httpd';

let arrayMenusFR: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];
let arrayMenusEN: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];
let arrayMenusDE: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];

function getSiteListFromWPVeritas(): Promise<Site[]> {
    info('Start getting wp-veritas sites', { url: wpVeritasURL, method: 'getSiteListFromWPVeritas'});
    const request: RequestInfo = new Request(wpVeritasURL, {
        method: 'GET',
        headers: headers
    });

    return fetch(request).then(res => res.json()).then(res => {
        info('End getting wp-veritas sites', { url: wpVeritasURL, method: 'getSiteListFromWPVeritas'});
        return res as Site[];
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

            switch ( lang ) {
                case "fr":
                    arrayMenusFR.push( { urlInstanceRestUrl: siteUrlSubstring, entries: result.items } );
                    break;
                case "de":
                    arrayMenusDE.push( { urlInstanceRestUrl: siteUrlSubstring, entries: result.items } );
                    break;
                default: //en
                    arrayMenusEN.push( { urlInstanceRestUrl: siteUrlSubstring, entries: result.items } );
                    break;
            }
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

function getErrorMessage(e: any) {
    let message: string = '';

    if (typeof e === "string") {
        message = e;
    } else if (e instanceof Error) {
        message = e.message;
    }

    return message;
}

export async function refreshMenu() {
    info('Start refresh from API', { url: '', method: 'refreshMenu'});
    const sites = await getSiteListFromWPVeritas();
    const filteredListOfSites: Site[] = sites.filter(function (site){
        return openshiftEnv.includes(site.openshiftEnv);
    });
    const promises: Promise<MenuAPIResult[]>[] = [
        getMenusInParallel(filteredListOfSites, "en", getMenuForSite, 10),
        getMenusInParallel(filteredListOfSites, "fr", getMenuForSite, 10),
        getMenusInParallel(filteredListOfSites, "de", getMenuForSite, 10)
    ];

    await Promise.all(promises);
    info('End refresh from API', { url: '', method: 'refreshMenu'});
}

    if (errors !== '') {
        console.log(errors);  //TODO where we should write errors?
    }

    return errors;
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
