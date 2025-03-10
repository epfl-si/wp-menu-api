import {getBaseUrl} from "../utils/links";
import {external_detached_menus_counter, info, warn} from "../utils/logger";
import {MenuEntry} from "./MenuEntry";
import {getSiteTreeReadOnlyByLanguage} from "../menus/refresh";

type MenuEntryByUrl = {[urlInstanceRestUrl : string]: MenuEntry};

export interface SiteTreeInstance  {
    getParent : (urlInstanceRestUrl: string,  idChild: number) => MenuEntryByUrl | undefined
    getChildren : (urlInstanceRestUrl: string, idParent: number) => MenuEntry[]
    findExternalMenuByRestUrl : (urlInstanceRestUrl: string) => MenuEntry | undefined
    findItemByRestUrlAndId: (urlInstanceRestUrl: string, idItem: number) => MenuEntry | undefined
    getSiblings : (urlInstanceRestUrl: string, idItem: number) => MenuEntry[]
    findItemByUrl: (pageURL: string) => MenuEntryByUrl | undefined
    findItemAndObjectTypeByUrl: (pageURL: string) => { result: MenuEntryByUrl | undefined, objectType: string}
    findLevelZeroByUrl: (pageURL: string) => MenuEntryByUrl | undefined
    length: () => number
    getCustomMenus: () => { urlInstanceRestUrl: string, entries: MenuEntry }[]
    getExternalMenus: () => { urlInstanceRestUrl: string, entries: MenuEntry }[]
    getPages: () => { urlInstanceRestUrl: string, entries: MenuEntry }[]
    getPosts: () => { urlInstanceRestUrl: string, entries: MenuEntry }[]
    getCategories: () => { urlInstanceRestUrl: string, entries: MenuEntry }[]
}

export type SiteTreeConstructor = (menus : { urlInstanceRestUrl: string, entries: MenuEntry[] | undefined }[]) => SiteTreeInstance

export const SiteTreeReadOnly : SiteTreeConstructor = function(menus) {
    const itemsByID : { [urlInstanceRestUrl : string]: { [idItem : number]: MenuEntry } } = {};
    const parents: { [urlInstanceRestUrl : string]: { [idChild : number]: MenuEntry } } = {};
    const children: { [urlInstanceRestUrl : string]: { [idParent : number]: MenuEntry[] } } = {};
    const externalMenus: { [urlInstanceRestUrl : string]: MenuEntry[] } = {};
    const notCustomItemsByUrl : { [fullUrl : string]: MenuEntryByUrl } = {};
    const customItemsByUrl : { [fullUrl : string]: MenuEntryByUrl } = {};
    const levelZeroByUrl : { [urlSiteWithoutHomePage : string]: MenuEntryByUrl } = {};
    const menusEntriesByObjectType: {[objectType: string] : { urlInstanceRestUrl: string, entries: MenuEntry }[]} = {}

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
                if (!notCustomItemsByUrl[fullUrl]) {
                    notCustomItemsByUrl[fullUrl] = {};
                }
                notCustomItemsByUrl[fullUrl][menu.urlInstanceRestUrl] = item;
            } else if(fullUrl && item.object == 'custom') {
                if (!customItemsByUrl[fullUrl]) {
                    customItemsByUrl[fullUrl] = {};
                }
                customItemsByUrl[fullUrl][menu.urlInstanceRestUrl] = item;
            }

            /*** get all levelZero by url ***/
            if(item.menu_item_parent.toString() === "0" && item.menu_order === 1 && item.getFullUrl()) {
                const urlSiteWithoutHomePage = getBaseUrl(item.getFullUrl());
                if (!levelZeroByUrl[urlSiteWithoutHomePage]) {
                    levelZeroByUrl[urlSiteWithoutHomePage] = {};
                }
                levelZeroByUrl[urlSiteWithoutHomePage][menu.urlInstanceRestUrl] = item;
            }

            /*** group all menusEntries by object type ***/
            if (!menusEntriesByObjectType[item.object]) {
                menusEntriesByObjectType[item.object] = [];
            }
            menusEntriesByObjectType[item.object].push({urlInstanceRestUrl: menu.urlInstanceRestUrl, entries: item});
        });
    });

    info(`END ANALYSE`, { method: 'SiteTreeReadOnly' });

    return {
        getParent(urlInstanceRestUrl: string, idChild:number): MenuEntryByUrl {
            const result: MenuEntryByUrl = {};
            const parent = parents[urlInstanceRestUrl][idChild];//it could be undefined;
            if (parent === undefined) {
                for (const [url, menuEntries] of Object.entries(externalMenus)) {
                    const entry = menuEntries.find(menuEntry => menuEntry.getFullUrl() === urlInstanceRestUrl);
                    if (entry) {
                        result[url] = itemsByID[url][entry.menu_item_parent];
                        return result;
                    }
                }
            }
            result[urlInstanceRestUrl] = parent;
            return result;
        },
        getChildren(urlInstanceRestUrl: string, idParent:number) {
            const childrenInTheSameSite = children[urlInstanceRestUrl][idParent] || [];
            const childrenList = childrenInTheSameSite.map(child => {
                if (child.object === 'epfl-external-menu'){
                    const m = getSiteTreeReadOnlyByLanguage();
                    let foundExternalMenu: MenuEntry | undefined = child;
                    Object.keys(m.menus).forEach(lang => {
                        let siteArray: SiteTreeInstance = m.menus[lang];
                        const foundExternalMenuByUrl = siteArray.findExternalMenuByRestUrl(child.getFullUrl());
                        if (foundExternalMenuByUrl) {
                            foundExternalMenu = foundExternalMenuByUrl;
                        }
                    });
                    return foundExternalMenu;
                }
                return child;//for normal menus or external not found menus
            });
            const detachedMenus = childrenList.filter(c => c.object == 'epfl-external-menu');
            detachedMenus.map(em => {
                warn("External detached menu found", {url: em.title});
                external_detached_menus_counter.labels({url: em.title}).set(1);
            });
            return childrenList.filter(c => c.object !== 'epfl-external-menu');
        },
        getSiblings(urlInstanceRestUrl: string, idItem:number)  {
            const parent = this.getParent(urlInstanceRestUrl,idItem);
            if (parent) {
                const newUrl = Object.keys(parent)[0];
                if (parent[newUrl]) {
                    const children = this.getChildren(newUrl,parent[newUrl].ID);
                    return children;//.filter(menu => menu.ID!=idItem);
                }else {
                    return [];
                }
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
        findItemByUrl(pageURL: string): MenuEntryByUrl | undefined {
            return notCustomItemsByUrl[pageURL];
        },
        findItemAndObjectTypeByUrl(pageURL: string) {
            let result: MenuEntryByUrl | undefined;
            let objectType: string = '';
            const notCustomItem: MenuEntryByUrl | undefined = notCustomItemsByUrl[pageURL];
            if (notCustomItem) {
                result = notCustomItem;
                objectType = notCustomItem[Object.keys(notCustomItem)[0]].object;
            } else {
                const customItem: MenuEntryByUrl | undefined = customItemsByUrl[pageURL];
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
            return menusEntriesByObjectType['custom'] ?? [];
        },
        getExternalMenus () {
            return menusEntriesByObjectType['epfl-external-menu'] ?? [];
        },
        getPages () {
            return menusEntriesByObjectType['page'] ?? [];
        },
        getPosts () {
            return menusEntriesByObjectType['post'] ?? [];
        },
        getCategories () {
            return menusEntriesByObjectType['category'] ?? [];
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
