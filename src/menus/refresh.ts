import {Site} from "../interfaces/site";
import {Request} from "express";
import {ErrorResult, MenuAPIResult} from "../interfaces/menuAPIResult";
import {SiteTree, SiteTreeInstance} from "../interfaces/siteTree";
import {WpMenu} from "../interfaces/wpMenu";


const headers: Headers = new Headers();
headers.set('Content-Type', 'application/json');
headers.set('Accept', 'application/json');

const restUrlEnd: string = 'wp-json/epfl/v1/menus/top?lang=';
const openshiftEnv: string[] = JSON.parse(process.env.OPENSHIF_ENV || '["rmaggi"]');
const wpVeritasURL: string = process.env.WPVERITAS_URL || 'https://wp-veritas-test.epfl.ch/api/v1/sites';
const protocolHostAndPort: string = process.env.MENU_API_PROTOCOL_HOST_PORT || 'http://wp-httpd';
let errors: string = '';

const arrayMenusFR: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];
const arrayMenusEN: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];
const arrayMenusDE: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];

function getSiteListFromWPVeritas(): Promise<Site[]> {
    const request: RequestInfo = new Request(wpVeritasURL, {
        method: 'GET',
        headers: headers
    });

    return fetch(request).then(res => res.json()).then(res => {
        return res as Site[];
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

            return result;
        } else {
            errors = errors.concat("\n").concat(siteMenuURL).concat(" - ").concat(JSON.stringify(result));

            return new ErrorResult(siteMenuURL.concat(" - ").concat(result.status));
        }
    }).catch ((error) => {
        let message: string = '';

        if (typeof error === "string") {
            message = error;
        } else if (error instanceof Error) {
            message = error.message;
        }

        errors = errors.concat("\n").concat(siteMenuURL).concat(" - ").concat(message);

        return new ErrorResult(siteMenuURL.concat(" - ").concat(message));
    });
}

export async function refreshMenu(): Promise<string> {
    errors = '';
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
