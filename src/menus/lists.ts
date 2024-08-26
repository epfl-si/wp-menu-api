import {WpMenu} from "../interfaces/wpMenu";
import {SiteTreeInstance} from "../interfaces/siteTree";
import {error, info, orphan_pages_counter} from "../utils/logger";
import {getAssocBreadcrumb, getBaseUrl, getLabsLink, getMenuBarLinks} from "../utils/links";
import {getCachedMenus} from "./refresh";

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

export function getMenuItems (url: string, lang: string, type: string, pageType: string, mainPostPageName: string,
                              mainPostPageUrl: string, homePageUrl: string, currentPostName: string) : {list: WpMenu[], errors: number} {
    let err = 0;
    info('Start getting page breadcrumb/siblings', {url: url, lang: lang, method: 'getMenuItems: '.concat(type)});
    let items: WpMenu[] = [];
    const m = getCachedMenus();
    let siteArray: SiteTreeInstance | undefined = m.menus[lang].getMenus();

    if (siteArray) {
        const firstSite: { result: { [urlInstance: string]: WpMenu } | undefined, objectType: string } = siteArray.findItemAndObjectTypeByUrl(url);

        if (firstSite.result) {
            const restUrl = Object.keys(firstSite.result)[0];
            info('Page found', {url: restUrl, lang: lang, method: 'getMenuItems: '.concat(type)});

            items = getListFromFirstSite(firstSite.result, restUrl, type, items, siteArray, lang );
            orphan_pages_counter.labels( {url: url, lang: lang }).set(0);
        } else {
            if (firstSite.objectType != 'custom') {
                error('orphan_page', {url: url, lang: lang});
                orphan_pages_counter.labels( {url: url, lang: lang }).set(1);
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
                    const homePagePosts: WpMenu = {
                        ID: 0, menu_item_parent: 0, menu_order: 0, object: "post", type_label: "Post",
                        title: mainPostPageName ?? 'Posts', url: mainPostPageUrl ?? (homePageUrl + '?post_type=post')};
                    items.push(homePagePosts);

                    if (url.indexOf(mainPostPageUrl) == -1 && url.indexOf('?post_type=post') == -1){
                        // the post page url is different from the main post page url:
                        // the main post page url includes the post name
                        // So we should include the post item only if the current url doesn't include the main post page url
                        const postPage: WpMenu = {
                            ID: 0, menu_item_parent: 0, menu_order: 0, object: "post", type_label: "Post",
                            title: currentPostName, url: url};
                        items.push(postPage);
                    }
                    orphan_pages_counter.labels( {url: homePageUrl, lang: lang }).set(0);
                } else {
                    info('orphan_post', {url: homePageUrl, lang: lang});
                    orphan_pages_counter.labels( {url: homePageUrl, lang: lang }).set(1);
                    err ++;
                }
            }
            err ++;
        }
    } else {
        error('menu_array_not_found', {lang: lang});
        err ++;
    }

    return {list: items, errors: err};
}


function getListFromFirstSite(firstSite: {
    [p: string]: WpMenu
}, restUrl: string, type: string, items: WpMenu[], siteArray: SiteTreeInstance, lang: string) : WpMenu[] {
    if (firstSite[restUrl]) {
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
    return items;
}
