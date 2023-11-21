import {WpMenu} from "../interfaces/wpMenu";
import {SiteTreeInstance} from "../interfaces/siteTree";
import {getArraySiteTreeByLanguage} from "./refresh";
import {error, info} from "../utils/logger";


function searchAllParentsEntriesByID(entry: WpMenu, urlInstanceRestUrl: string, siteArray: SiteTreeInstance): WpMenu[] {
    const parent: { [urlInstance : string]: WpMenu } | undefined = siteArray.getParent(urlInstanceRestUrl,entry.ID);

    if (parent) {
        const newUrl = Object.keys(parent)[0];

        if (parent[newUrl]) {
            const parents: WpMenu[] = searchAllParentsEntriesByID(parent[newUrl], newUrl , siteArray);
            return [...parents, parent[newUrl]];
        } else {
            info('Start getting breadcrumb: not parent present with this url', {url: urlInstanceRestUrl, method: 'searchAllParentsEntriesByID'});
            return [];
        }
    } else {
        info('Start getting breadcrumb: not parent present', {url: urlInstanceRestUrl, method: 'searchAllParentsEntriesByID'});
        return [];
    }
}

export function getMenuItems (url: string, lang: string, type: string) : WpMenu[] {
    info('Start getting page breadcrumb/siblings', {url: url, lang: lang, method: 'getMenuItems: '.concat(type)});
    let items: WpMenu[] = [];
    let siteArray: SiteTreeInstance | undefined = getArraySiteTreeByLanguage(lang);

    if (siteArray) {
        let firstSite: { [urlInstance: string]: WpMenu } | undefined = siteArray.findItemByUrl(url);

        if (firstSite) {
            const restUrl = Object.keys(firstSite)[0];
            info('First site found', {url: restUrl, lang: lang,  method: 'getMenuItems: '.concat(type)});

            if (firstSite[restUrl]) {
                switch ( type ) {
                    case "siblings":
                        items = siteArray.getSiblings(restUrl,firstSite[restUrl].ID);
                        break;
                    case "breadcrumb":
                        console.log('first site',firstSite[restUrl]);
                        items = [...searchAllParentsEntriesByID(firstSite[restUrl], restUrl, siteArray), firstSite[restUrl]];
                        break;
                }
            }
        } else {
            error('First site not found', {url: url, lang: lang,  method: 'getMenuItems: '.concat(type)});
        }
    } else {
        error('Array menu by language not found', {url: url, lang: lang,  method: 'getMenuItems: '.concat(type)});
    }

    return items;
}
