import { Site } from "./interfaces/site";
import { MenuAPIResult, ErrorResult } from './interfaces/menuAPIResult'
import {WpMenu} from "./interfaces/wpMenu";
import express, { Request, Response } from 'express';
import {SiteTree, SiteTreeInstance} from "./interfaces/siteTree";
import * as dotenv from 'dotenv';

const app = express()

const headers: Headers = new Headers();
headers.set('Content-Type', 'application/json');
headers.set('Accept', 'application/json');

debugger;

dotenv.config();
const restUrlEnd: string = 'wp-json/epfl/v1/menus/top?lang=';
const openshiftEnv: string[] = JSON.parse(process.env.OPENSHIF_ENV || '["rmaggi"]');
const wpVeritasURL: string = process.env.WPVERITAS_URL || 'https://wp-veritas-test.epfl.ch/api/v1/sites';
const hostAndPort: string = process.env.MENU_API_HOST_PORT || 'wp-httpd:8080';
const servicePort: number = parseInt(process.env.SERVICE_PORT || '3001', 10);
const isDev: boolean = process.env.IS_DEV ==='true';

const arrayMenusFR: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];
const arrayMenusEN: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];
const arrayMenusDE: { urlInstanceRestUrl: string, entries: WpMenu[] }[] = [];
let errors: number = 0;

function getSiteListFromWPVeritas(): Promise<Site[]> {
    const request: RequestInfo = new Request(wpVeritasURL, {
        method: 'GET',
        headers: headers
    });

    return fetch(request).then(res => res.json()).then(res => {
        return res as Site[];
    });
}

function getMenuForSite(siteURL: string, lang: string): Promise<MenuAPIResult> {
    if (isDev){
        siteURL = siteURL.replace("wp-httpd.epfl.ch",hostAndPort);
    }
    const siteMenuURL: string = siteURL.concat(restUrlEnd).concat(lang);
    console.log("siteMenuURL", siteMenuURL);
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
        if (result.status && result.status==='OK'){
            const siteUrlSubstring = siteMenuURL.substring(siteMenuURL.indexOf(hostAndPort)+hostAndPort.length);
            console.log("siteUrlSubstring", siteUrlSubstring);
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
            errors++;
            console.log(result);
            return new ErrorResult(siteMenuURL.concat(" - ").concat(result.status));
        }
    }).catch ((error) => {
        let message: string = '';
        if (typeof error === "string") {
            message = error;
        } else if (error instanceof Error) {
            message = error.message;
        }
        errors++;
        console.log(message);
        return new ErrorResult(siteMenuURL.concat(" - ").concat(message));
    });
}

async function getMenuInParallel(sites: Site[], lang: string, fn: (siteURL: string, language: string) => Promise<MenuAPIResult>, threads = 10): Promise<MenuAPIResult[]> {
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

const searchAllParentsEntriesByID = (entry: WpMenu, urlInstanceRestUrl: string, siteArray: SiteTreeInstance): WpMenu[] => {
    const parent: { [urlInstance : string]: WpMenu } | undefined = siteArray.getParent(urlInstanceRestUrl,entry.ID);
    if (parent) {
        const newUrl = Object.keys(parent)[0];
        if (parent[newUrl]) {
            const parents: WpMenu[] = searchAllParentsEntriesByID(parent[newUrl], newUrl , siteArray);
            return [...parents, parent[newUrl]];
        }else {
            return [];
        }
    } else {
        return [];
    }
}

function createResponse(url: string, lang: string, type: string) : WpMenu[] {
    let items: WpMenu[] = [];

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

    console.log(url);
    let firstSite: { [urlInstance: string]: WpMenu } | undefined = siteArray.findItemByUrl(url);
    console.log(firstSite);
    if (firstSite) {
        const restUrl = Object.keys(firstSite)[0];
        if (firstSite[restUrl]) {
            switch ( type ) {
                case "siblings":
                    items = siteArray.getSiblings(restUrl,firstSite[restUrl].ID);
                    break;
                case "breadcrumb":
                    items = firstSite !== undefined ? [
                        ...searchAllParentsEntriesByID(firstSite[restUrl], restUrl, siteArray),
                    ] : [];
                    break;
            }
        }
    }
    return items;
}

app.get('/refreshMenus', (req, res) => {
    errors = 0;
    getSiteListFromWPVeritas().then(async sites => {
        const filteredListOfSites: Site[] = sites.filter(function (site){
            return openshiftEnv.includes(site.openshiftEnv);
        });
        await getMenuInParallel(filteredListOfSites, "en", getMenuForSite, 10);
        await getMenuInParallel(filteredListOfSites, "fr", getMenuForSite, 10);
        await getMenuInParallel(filteredListOfSites, "de", getMenuForSite, 10);
        console.log(errors);
        if (errors>0){
            res.send('Menu list charged with errors');
        }else {
            res.send('Menu list charged');
        }
    });
});

app.get('/details', (req, res) => {
    const url: string = req.query.url as string;
    const lang: string = req.query.lang as string;
    const type: string = req.query.type as string;

    res.json({
        status: "OK",
        result: createResponse(url, lang, type)
    })
});

app.listen(servicePort, () => {
    console.log(`Server is running on port ${servicePort}`);
});
