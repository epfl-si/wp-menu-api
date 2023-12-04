import {WpMenu} from "../interfaces/wpMenu";
import {SiteTreeInstance} from "../interfaces/siteTree";
import {getArraySiteTreeByLanguage} from "./refresh";
import {error, info} from "../utils/logger";
import {getAssocBreadcrumb, getBaseUrl, getLabsLink, getMenuBarLinks} from "../utils/links";

function searchAllParentsEntriesByID(entry: WpMenu, urlInstanceRestUrl: string, siteArray: SiteTreeInstance, labLink: string, assocBreadcrumbs: string[]): WpMenu[] {
    const parent: { [urlInstance : string]: WpMenu } | undefined = siteArray.getParent(urlInstanceRestUrl,entry.ID);

    if (parent) {
        const newUrl = Object.keys(parent)[0];

        if (parent[newUrl]) {
            const parents: WpMenu[] = searchAllParentsEntriesByID(parent[newUrl], newUrl , siteArray, labLink, assocBreadcrumbs);
            return [...parents, parent[newUrl]];
        } else {
            return searchParentForLabAndAssoc(urlInstanceRestUrl, siteArray, entry, labLink, assocBreadcrumbs);
        }
    } else {
        return searchParentForLabAndAssoc(urlInstanceRestUrl,siteArray, entry, labLink, assocBreadcrumbs);
    }
}

function searchParentForLabAndAssoc(url: string, siteArray: SiteTreeInstance, entry: WpMenu, labLink: string, assocBreadcrumbs: string[]) {
    if (url.indexOf("/labs/") > -1 && entry.url !== labLink) {
        const lab = getItemMenuByUrl(siteArray, labLink);
        if (lab) {
            return [lab];
        } else {
            info('Get lab: parent undefined', {url: url, method: 'searchParent'});
        }
    } else if (url.indexOf('/associations/') > -1) {
        const items: WpMenu[] = [];
        assocBreadcrumbs.forEach(u => {
            const menu = siteArray!.findItemByUrl(u);
            if (menu) {
                const k = Object.keys(menu)[0];
                if (menu[k] && menu[k].url!==entry.url) {
                    items.push(menu[k]);
                }
            }
        });
        return items;
    }
    return [];
}

function getItemMenuByUrl(siteArray: SiteTreeInstance, url: string) {
    const item: { [urlInstance : string]: WpMenu } | undefined = siteArray.findItemByUrl(url);
    if (item) {
        const itemUrl = Object.keys(item)[0];
        if (item[itemUrl]) {
            return item[itemUrl];
        }
    }
    return undefined;
}

function getLabOrAssoc(url: string, siteArray: SiteTreeInstance): WpMenu | undefined {
    const labsOrAssoc: { [urlInstance : string]: WpMenu } | undefined = siteArray.findItemByUrl(url);
    if (labsOrAssoc) {
        const labUrl = Object.keys(labsOrAssoc)[0];
        if (labsOrAssoc[labUrl]) {
            return labsOrAssoc[labUrl];
        }
    }
    info('Get lab or assoc: undefined', {url: url, method: 'getLabOrAssoc'});
    return undefined
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
                console.log('first site',firstSite[restUrl]);
                switch ( type ) {
                    case "siblings":
                        items = siteArray.getSiblings(restUrl,firstSite[restUrl].ID);

                        //We create manually siblings list for level zero of menus (about, education, research, innovation, schools, campus, labs)
                        if (items.length == 0 && firstSite[restUrl].menu_item_parent.toString() == "0" && firstSite[restUrl].menu_order === 1 && firstSite[restUrl].url) {
                            const listMenuBarLinks: string[] = getMenuBarLinks(lang);
                            const urlSiteWithoutHomePage: string = getBaseUrl(firstSite[restUrl].url!);
                            if (Array.isArray(listMenuBarLinks) && listMenuBarLinks.includes(urlSiteWithoutHomePage)) {
                                listMenuBarLinks.forEach(u => {
                                    const menu = siteArray!.findLevelZeroByUrl(u);
                                    if (menu) {
                                        const k = Object.keys(menu)[0];
                                        if (menu[k]) {
                                            items.push(menu[k]);
                                        }
                                    }
                                });
                            }
                        }
                        break;
                    case "breadcrumb":
                        const labLink = getLabsLink(lang);
                        const assocBreadcrumbs = getAssocBreadcrumb(lang);
                        items = [...searchAllParentsEntriesByID(firstSite[restUrl], restUrl, siteArray, labLink, assocBreadcrumbs), firstSite[restUrl]];
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
