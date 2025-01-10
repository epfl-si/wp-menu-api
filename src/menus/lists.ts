import {SiteTreeInstance} from "../interfaces/siteTree";
import {error, getErrorMessage, info, orphan_pages_counter} from "../utils/logger";
import {getAssocBreadcrumb, getBaseUrl, getLabsLink, getMenuBarLinks} from "../utils/links";
import {getCachedMenus} from "./refresh";
import {MenuEntry} from "../interfaces/MenuEntry";
import {Site} from "../interfaces/site";
import {getSiteListFromWPVeritas} from "../utils/source";
import {Config} from "../utils/configFileReader";
import {urlToHttpOptions} from 'node:url';

function searchAllParentsEntriesByID(entry: MenuEntry, urlInstanceRestUrl: string, siteArray: SiteTreeInstance, labLink: string, assocBreadcrumbs: string[]): MenuEntry[] {
    const parent: { [urlInstance : string]: MenuEntry } | undefined = siteArray.getParent(urlInstanceRestUrl,entry.ID);

    if (parent) {
        const newUrl = Object.keys(parent)[0];

        if (parent[newUrl]) {
            const parents: MenuEntry[] = searchAllParentsEntriesByID(parent[newUrl], newUrl , siteArray, labLink, assocBreadcrumbs);
            return [...parents, parent[newUrl]];
        } else {
            return searchParentForLabAndAssoc(urlInstanceRestUrl, siteArray, entry, labLink, assocBreadcrumbs);
        }
    } else {
        return searchParentForLabAndAssoc(urlInstanceRestUrl,siteArray, entry, labLink, assocBreadcrumbs);
    }
}

function searchParentForLabAndAssoc(url: string, siteArray: SiteTreeInstance, entry: MenuEntry, labLink: string, assocBreadcrumbs: string[]) {
    if (url.indexOf("/labs/") > -1 && entry.getFullUrl() !== labLink) {
        const lab = getItemMenuByUrl(siteArray, labLink);
        if (lab) {
            return [lab];
        } else {
            info('Get lab: parent undefined', {url: url, method: 'searchParent'});
        }
    } else if (url.indexOf('/associations/') > -1) {
        const items: MenuEntry[] = [];
        assocBreadcrumbs.forEach(u => {
            const menu = siteArray!.findItemByUrl(u);
            if (menu) {
                const k = Object.keys(menu)[0];
                if (menu[k] && menu[k].getFullUrl()!==entry.getFullUrl()) {
                    items.push(menu[k]);
                }
            }
        });
        return items;
    }
    return [];
}

function getItemMenuByUrl(siteArray: SiteTreeInstance, url: string) {
    const item: { [urlInstance : string]: MenuEntry } | undefined = siteArray.findItemByUrl(url);
    if (item) {
        const itemUrl = Object.keys(item)[0];
        if (item[itemUrl]) {
            return item[itemUrl];
        }
    }
    return undefined;
}

function getLabOrAssoc(url: string, siteArray: SiteTreeInstance): MenuEntry | undefined {
    const labsOrAssoc: { [urlInstance : string]: MenuEntry } | undefined = siteArray.findItemByUrl(url);
    if (labsOrAssoc) {
        const labUrl = Object.keys(labsOrAssoc)[0];
        if (labsOrAssoc[labUrl]) {
            return labsOrAssoc[labUrl];
        }
    }
    info('Get lab or assoc: undefined', {url: url, method: 'getLabOrAssoc'});
    return undefined
}

export function getMenuItems (url: string, lang: string, type: string, pageType: string, mainPostPageName: string,
                              mainPostPageUrl: string, homePageUrl: string, currentPostName: string) : {list: {title: string, url: string, object: string}[], errors: number} {
    let err = 0;
    info('Start getting page breadcrumb/siblings', {url: url, lang: lang, method: 'getMenuItems: '.concat(type)});
    let items: MenuEntry[] = [];
    const m = getCachedMenus();
    let siteArray: SiteTreeInstance | undefined = m.menus[lang].getMenus();

    if (siteArray) {
        const firstSite: { result: { [urlInstance: string]: MenuEntry } | undefined, objectType: string } = siteArray.findItemAndObjectTypeByUrl(url);

        if (firstSite.result) {
            const restUrl = Object.keys(firstSite.result)[0];
            info('Page found', {url: restUrl, lang: lang, method: 'getMenuItems: '.concat(type)});

            items = getListFromFirstSite(firstSite.result, restUrl, type, items, siteArray, lang );
            orphan_pages_counter.labels( {url: url, lang: lang }).set(0);
        } else {
            if (firstSite.objectType != 'custom' && firstSite.objectType != 'post') {
                error('orphan_page', {url: url, lang: lang});
                orphan_pages_counter.labels( {url: url, lang: lang }).set(1);
                err ++;
            }
            if (pageType == 'post' && type == 'breadcrumb') {
                //if the site is not found and we are looking for a post page not attached to the menu,
                //we will found the breadcrumb for his site home page and manually add the home post page and the current post page
                const levelzero = siteArray.findLevelZeroByUrl(homePageUrl);

                if (levelzero) {
                    const restUrl = Object.keys(levelzero)[0];
                    info('Site home page for post found', {url: restUrl, lang: lang, method: 'getMenuItems: '.concat(type)});

                    items = getListFromFirstSite(levelzero, restUrl, type, items, siteArray, lang );

                    //we add the site post home page to the breadcrumb:
                    // if the post home page is defined in wordpress we get his name ans url into the item,
                    // otherwise we create the item manually
                    const homePagePosts: MenuEntry = MenuEntry.parse(new Site('', '', true), {
                        ID: 0, menu_item_parent: 0, menu_order: 0, object: "post", type_label: "Post",
                        title: mainPostPageName ?? 'Posts', url: mainPostPageUrl ?? (homePageUrl + '?post_type=post')});
                    items.push(homePagePosts);

                    if (url.indexOf(mainPostPageUrl) == -1 && url.indexOf('?post_type=post') == -1){
                        // the post page url is different from the main post page url:
                        // the main post page url includes the post name
                        // So we should include the post item only if the current url doesn't include the main post page url
                        const postPage: MenuEntry = MenuEntry.parse(new Site('', '', true), {
                            ID: 0, menu_item_parent: 0, menu_order: 0, object: "post", type_label: "Post",
                            title: currentPostName, url: url});
                        items.push(postPage);
                    }
                    orphan_pages_counter.labels( {url: homePageUrl, lang: lang }).set(0);
                } else {
                    info('orphan_post', {url: homePageUrl, lang: lang});
                    orphan_pages_counter.labels( {url: homePageUrl, lang: lang }).set(1);
                    err ++;
                }
            }
        }
    } else {
        error('menu_array_not_found', {lang: lang});
        err ++;
    }

    return {list: items.map(i => ({title: i.title, url: i.getFullUrl(), object: i.object})), errors: err};
}


function getListFromFirstSite(firstSite: {
    [p: string]: MenuEntry
}, restUrl: string, type: string, items: MenuEntry[], siteArray: SiteTreeInstance, lang: string) : MenuEntry[] {
    if (firstSite[restUrl]) {
        switch ( type ) {
            case "siblings":
                items = siteArray.getSiblings(restUrl,firstSite[restUrl].ID);

                //We create manually siblings list for level zero of menus (about, education, research, innovation, schools, campus, labs)
                if (items.length == 0 && firstSite[restUrl].menu_item_parent.toString() == "0" && firstSite[restUrl].menu_order === 1 && firstSite[restUrl].getFullUrl()) {
                    const listMenuBarLinks: string[] = getMenuBarLinks(lang);
                    const urlSiteWithoutHomePage: string = getBaseUrl(firstSite[restUrl].getFullUrl()!);
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
            case "children":
                items = siteArray.getChildren(restUrl,firstSite[restUrl].ID);
                break;
        }
    }
    return items;
}


export async function getSiteTree(siteURL: string, config: Config | undefined) {
    try {
        if (config) {
            const sites = await getSiteListFromWPVeritas(config);
            siteURL = siteURL.endsWith('/') ? siteURL : siteURL + '/';
            const basePattern = `^${siteURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\/]+\/?$`;
            const regex = new RegExp(basePattern);
            const children = sites.filter(site => regex.test(site.url));
            const parentURL = siteURL.replace(/\/([^\/]+\/?)$/, '/');
            const parent = sites.filter(site => site.url == parentURL);
            return {children: children.map(c => urlToHttpOptions(new URL(c.url))), parent: parent.map(p =>urlToHttpOptions(new URL(p.url)))};
        } else {
            return {children: [], parent: [], error: "No configuration found"};
        }
    } catch (e) {
        return {children: [], parent: [], error: getErrorMessage(e)};
    }
}
