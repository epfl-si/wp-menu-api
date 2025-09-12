import {getBaseUrl} from "../utils/links";
import {external_detached_menus_counter, info, warn} from "../utils/logger";
import {MenuEntry} from "./MenuEntry";
import {getSiteTreeReadOnlyByLanguage} from "../menus/refresh";

export type MenuEntryAndUrl = {urlInstanceRestUrl : string, entry: MenuEntry};

export interface SiteTreeInstance  {
    getParent : (urlInstanceRestUrl: string,  idChild: number) => MenuEntryAndUrl | undefined
    getChildren : (urlInstanceRestUrl: string, idParent: number) => MenuEntryAndUrl[]
    findExternalMenuByRestUrl : (urlInstanceRestUrl: string) => MenuEntry | undefined
    findItemByRestUrlAndId: (urlInstanceRestUrl: string, idItem: number) => MenuEntry | undefined
    getSiblings : (urlInstanceRestUrl: string, idItem: number) => MenuEntry[]
    findItemByUrl: (pageURL: string) => MenuEntryAndUrl | undefined
    findItemAndObjectTypeByUrl: (pageURL: string) => { result: MenuEntryAndUrl | undefined, objectType: string}
    findLevelZeroByUrl: (pageURL: string) => MenuEntryAndUrl | undefined
    length: () => number
    getCustomMenus: () => MenuEntryAndUrl[]
    getExternalMenus: () => MenuEntryAndUrl[]
    getPages: () => MenuEntryAndUrl[]
    getPosts: () => MenuEntryAndUrl[]
    getCategories: () => MenuEntryAndUrl[]
}

export type SiteTreeConstructor = (menus : { urlInstanceRestUrl: string, entries: MenuEntry[] | undefined }[]) => SiteTreeInstance

export const SiteTreeReadOnly : SiteTreeConstructor = function(menus) {
    const itemsByID : { [urlInstanceRestUrl : string]: { [idItem : number]: MenuEntry } } = {};
    const parents: { [urlInstanceRestUrl : string]: { [idChild : number]: MenuEntry } } = {};
    const children: { [urlInstanceRestUrl : string]: { [idParent : number]: MenuEntry[] } } = {};
    const externalMenus: { [urlInstanceRestUrl : string]: MenuEntry[] } = {};
    const notCustomItemsByUrl : { [fullUrl : string]: MenuEntryAndUrl } = {};
    const customItemsByUrl : { [fullUrl : string]: MenuEntryAndUrl } = {};
    const levelZeroByUrl : { [urlSiteWithoutHomePage : string]: MenuEntryAndUrl } = {};
    const menuEntriesByObjectType: {[objectType: string] : MenuEntryAndUrl[]} = {}

    info(`START ANALYSE`, { method: 'SiteTreeReadOnly' });

    menus.forEach(menu => {
        itemsByID[menu.urlInstanceRestUrl] = {};
        parents[menu.urlInstanceRestUrl] = {};
        children[menu.urlInstanceRestUrl] = {};
        externalMenus[menu.urlInstanceRestUrl] = [];

        let entriesMenu = menu.entries;
        if (!entriesMenu) {
            entriesMenu = [];
        }

        entriesMenu.forEach(item => {
            itemsByID[menu.urlInstanceRestUrl][item.ID] = item
        });

        entriesMenu.forEach(item => {
            /*** map each item on each menu with his parent id ***/
            parents[menu.urlInstanceRestUrl][item.ID] = itemsByID[menu.urlInstanceRestUrl][item.menu_item_parent]

            /*** push into the parent array all his children, retrieved by the `menu_item_parent` ***/
            if (!children[menu.urlInstanceRestUrl][item.menu_item_parent]) {
                children[menu.urlInstanceRestUrl][item.menu_item_parent] = []
            }
            children[menu.urlInstanceRestUrl][item.menu_item_parent].push(item);

            /*** get all externalMenus ***/
            if(item.object == 'epfl-external-menu') {
                externalMenus[menu.urlInstanceRestUrl].push(item);
            }

            /*** get all notCustomItems and customItems by url ***/
            const fullUrl = item.getFullUrl();
            if(fullUrl && item.object !== 'custom') {
                notCustomItemsByUrl[fullUrl] = {
                    urlInstanceRestUrl: menu.urlInstanceRestUrl,
                    entry: item
                }
            } else if(fullUrl && item.object == 'custom') {
                customItemsByUrl[fullUrl] = {
                    urlInstanceRestUrl: menu.urlInstanceRestUrl,
                    entry: item
                }
            }

            /*** get all levelZero by url ***/
            if(item.menu_item_parent.toString() === "0" && item.menu_order === 1 && item.getFullUrl()) {
                const urlSiteWithoutHomePage = getBaseUrl(item.getFullUrl());
                levelZeroByUrl[urlSiteWithoutHomePage] = {
                  urlInstanceRestUrl: menu.urlInstanceRestUrl,
                  entry: item
                };
            }

            /*** group all menusEntries by object type ***/
            if (!menuEntriesByObjectType[item.object]) {
                menuEntriesByObjectType[item.object] = [];
            }
            menuEntriesByObjectType[item.object].push({urlInstanceRestUrl: menu.urlInstanceRestUrl, entry: item});
        });
    });

    info(`END ANALYSE`, { method: 'SiteTreeReadOnly' });

    return {
        getParent(urlInstanceRestUrl: string, idChild:number): MenuEntryAndUrl | undefined {
            const parent = parents[urlInstanceRestUrl][idChild];
            if (parent) {
                return { urlInstanceRestUrl, entry: parent };
            }

            for (const [url, menuEntries] of Object.entries(externalMenus)) {
                const entry = menuEntries.find(menuEntry => menuEntry.getFullUrl() === urlInstanceRestUrl);
                if (entry) {
                    return {
                        urlInstanceRestUrl: url,
                        entry: itemsByID[url][entry.menu_item_parent]
                    };
                }
            }
        },
        getChildren(urlInstanceRestUrl: string, idParent:number): MenuEntryAndUrl[] {
            const childrenAndURLsInTheSameSite = (children[urlInstanceRestUrl][idParent] || []).map(c => ({urlInstanceRestUrl, entry: c}));
            const childrenAndUrlList = childrenAndURLsInTheSameSite.map(childAndUrl => {
                if (childAndUrl.entry.object === 'epfl-external-menu'){
                    const m = getSiteTreeReadOnlyByLanguage();
                    let retVal: MenuEntryAndUrl | undefined = childAndUrl;
                    Object.keys(m.menus).forEach(lang => {
                        const siteArray: SiteTreeInstance = m.menus[lang];
                        const restURL = childAndUrl.entry.getFullUrl();
                        const foundExternalMenuByUrl = siteArray.findExternalMenuByRestUrl(restURL);
                        if (foundExternalMenuByUrl) {
                            retVal = {urlInstanceRestUrl: restURL, entry: foundExternalMenuByUrl};
                        }
                    });
                    return retVal;
                }
                return {urlInstanceRestUrl: childAndUrl.urlInstanceRestUrl, entry: childAndUrl.entry};//for normal menus or external not found menus
            });
            const detachedMenus = childrenAndUrlList.filter(c => c.entry.object == 'epfl-external-menu');
            detachedMenus.map(em => {
                warn("External detached menu found", {url: em.entry.title});
                external_detached_menus_counter.labels({url: em.entry.title}).set(1);
            });
            return childrenAndUrlList.filter(c => c.entry.object !== 'epfl-external-menu');
        },
        getSiblings(urlInstanceRestUrl: string, idItem:number)  {
            const parent = this.getParent(urlInstanceRestUrl,idItem);
            if (parent) {
                return this.getChildren(parent.urlInstanceRestUrl, parent.entry.ID).map(childAndURL => childAndURL.entry);
            } else {
                return []
            }
        },
        findExternalMenuByRestUrl(urlInstanceRestUrl: string) {
            if (itemsByID[urlInstanceRestUrl]) {
                const idItemMap = itemsByID[urlInstanceRestUrl];
                for (const idItem in idItemMap) {
                    const wpMenu = idItemMap[idItem];
                    if (wpMenu.menu_item_parent.toString() === "0" && wpMenu.menu_order === 1) {
                        return wpMenu;
                    }
                }
            }
            return undefined;
        },
        findItemByRestUrlAndId(urlInstanceRestUrl: string, idItem: number) {
            return itemsByID[urlInstanceRestUrl][idItem];
        },
        findItemByUrl(pageURL: string): MenuEntryAndUrl | undefined {
            return notCustomItemsByUrl[pageURL];
        },
        findItemAndObjectTypeByUrl(pageURL: string) {
            let result: MenuEntryAndUrl | undefined;
            let objectType: string = '';
            const notCustomItem = notCustomItemsByUrl[pageURL];
            if (notCustomItem) {
                result = notCustomItem;
                objectType = notCustomItem.entry.object;
            } else {
                const customItem = customItemsByUrl[pageURL];
                if (customItem) {
                    objectType = 'custom';
                }
            }
            return { result: result, objectType: objectType };
        },
        findLevelZeroByUrl(pageURL: string) {
            return levelZeroByUrl[pageURL];
        },
        length() {
            return menus.length;
        },
        getCustomMenus () {
            return menuEntriesByObjectType['custom'] ?? [];
        },
        getExternalMenus () {
            return menuEntriesByObjectType['epfl-external-menu'] ?? [];
        },
        getPages () {
            return menuEntriesByObjectType['page'] ?? [];
        },
        getPosts () {
            return menuEntriesByObjectType['post'] ?? [];
        },
        getCategories () {
            return menuEntriesByObjectType['category'] ?? [];
        },
    }
}

export class SiteTreeMutable {
    private menus: { urlInstanceRestUrl: string, entries: MenuEntry[] }[] = [];

    getReadOnlySiteTree() {
        return SiteTreeReadOnly(this.menus);
    }

    updateMenu(siteUrlSubstring: string, result: MenuEntry[]){
        const index = this.menus.findIndex(menu => menu.urlInstanceRestUrl === siteUrlSubstring);
        if (index > -1) {
            this.menus.splice(index, 1, { urlInstanceRestUrl: siteUrlSubstring, entries: result });
        } else {
            this.menus.push( { urlInstanceRestUrl: siteUrlSubstring, entries: result } );
        }
    }
}
