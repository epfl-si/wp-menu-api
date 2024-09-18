import {getBaseUrl} from "../utils/links";
import {error, external_detached_menus_counter, getErrorMessage, info, warn} from "../utils/logger";
import fs from "fs";
import {MenuEntry} from "./MenuEntry";

export interface SiteTreeInstance  {
    getParent : (urlInstanceRestUrl: string,  idChild: number) => { [urlInstance : string]: MenuEntry } | undefined
    getChildren : (urlInstanceRestUrl: string, idParent: number) => MenuEntry[]
    findExternalMenuByRestUrl : (urlInstanceRestUrl: string) => MenuEntry | undefined
    findItemByRestUrlAndId: (urlInstanceRestUrl: string, idItem: number) => MenuEntry | undefined
    getSiblings : (urlInstanceRestUrl: string, idItem: number) => MenuEntry[]
    findItemByUrl: (pageURL: string) => { [urlInstance: string]: MenuEntry } | undefined
    findItemAndObjectTypeByUrl: (pageURL: string) => { result: { [urlInstance: string]: MenuEntry } | undefined, objectType: string}
    findLevelZeroByUrl: (pageURL: string) => { [urlInstance: string]: MenuEntry } | undefined
}

export type SiteTreeConstructor = (menus : { urlInstanceRestUrl: string, entries: MenuEntry[] | undefined }[]) => SiteTreeInstance

export const SiteTreeReadOnly : SiteTreeConstructor = function(menus) {
    const itemsByID : { [urlInstanceRestUrl : string]: { [idItem : number]: MenuEntry } } = {};
    const parents: { [urlInstanceRestUrl : string]: { [idChild : number]: MenuEntry } } = {};
    const children: { [urlInstanceRestUrl : string]: { [idParent : number]: MenuEntry[] } } = {};

    menus.forEach(menu =>{
        itemsByID[menu.urlInstanceRestUrl] = {};
        parents[menu.urlInstanceRestUrl] = {};
        children[menu.urlInstanceRestUrl] = {};

        let entriesMenu = menu.entries;
        if (!entriesMenu) {
            entriesMenu = [];
        }

        entriesMenu.forEach(item => {
            itemsByID[menu.urlInstanceRestUrl][item.ID] = item
        });

        entriesMenu.forEach(item => {
            parents[menu.urlInstanceRestUrl][item.ID] = itemsByID[menu.urlInstanceRestUrl][item.menu_item_parent]
        });

        entriesMenu.forEach(item => {
            if (!children[menu.urlInstanceRestUrl][item.menu_item_parent]) {
                children[menu.urlInstanceRestUrl][item.menu_item_parent] = []
            }

            children[menu.urlInstanceRestUrl][item.menu_item_parent].push(item);
        });
    });

    return {
        getParent(urlInstanceRestUrl: string, idChild:number): { [urlInstance : string]: MenuEntry } {
            const result: { [urlInstance: string]: MenuEntry } = {};
            const parent = parents[urlInstanceRestUrl][idChild];//it could be undefined;
            if (parent === undefined) {
                for (const url in itemsByID) {
                    const items = itemsByID[url];
                    for (const id in items) {
                        const item = itemsByID[url][id];
                        if (item.object === "epfl-external-menu" && item.getFullUrl() === urlInstanceRestUrl){
                            result[url] = itemsByID[url][item.menu_item_parent];
                            return result;
                        }
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
                    const foundExternalMenu = this.findExternalMenuByRestUrl(child.getFullUrl());
                    if (foundExternalMenu) {
                        return foundExternalMenu;
                    }
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
        findItemByUrl(pageURL: string) {
            const result: { [urlInstance: string]: MenuEntry } = {};
            for (const url in itemsByID) {
                const items = itemsByID[url];
                for (const id in items) {
                    const item = itemsByID[url][id];
                    if (item.getFullUrl() && item.getFullUrl()===pageURL && item.object !== 'custom') {
                        result[url] = item
                        return result;
                    }
                }
            }
            return undefined;
        },
        findItemAndObjectTypeByUrl(pageURL: string) {
            const result: { [urlInstance: string]: MenuEntry } = {};
            let objectType: string = '';
            for (const url in itemsByID) {
                const items = itemsByID[url];
                for (const id in items) {
                    const item = itemsByID[url][id];
                    if (item.getFullUrl() && item.getFullUrl()===pageURL){
                        objectType = item.object;
                        if (item.object !== 'custom') {
                            result[url] = item
                            return { result: result, objectType: objectType };
                        }
                    }
                }
            }
            return { result: undefined, objectType: objectType };
        },
        findLevelZeroByUrl(pageURL: string) {
            const result: { [urlInstance: string]: MenuEntry } = {};
            for (const url in itemsByID) {
                const items = itemsByID[url];
                for (const id in items) {
                    const item = itemsByID[url][id];
                    if (item.menu_item_parent.toString() === "0" && item.menu_order === 1 && item.getFullUrl()){
                        const urlSiteWithoutHomePage: string = getBaseUrl(item.getFullUrl());
                        if (urlSiteWithoutHomePage == pageURL){
                            result[url] = item
                            return result;
                        }
                    }
                }
            }
            return undefined;
        }
    }
}

export class SiteTreeMutable {
    private menus: { urlInstanceRestUrl: string, entries: MenuEntry[] }[] = [];

    getMenus() {
        return SiteTreeReadOnly(this.menus);
    }

    get length() {
        return this.menus.length;
    }

    getCustomMenus () {
        const customMenus : { urlInstanceRestUrl: string, entries: MenuEntry }[] = [];
        for (let menu of this.menus) {
            if(menu.entries[0].object === 'custom') {
                customMenus.push( { urlInstanceRestUrl: menu.urlInstanceRestUrl, entries: menu.entries[0] } );
            }
        }
        return customMenus;
    }

    _getObject (objectTye: string) {
        const object : { urlInstanceRestUrl: string, entries: MenuEntry }[] = [];
        for (let menu of this.menus) {
            for (let entry of menu.entries) {
                if(entry.object === objectTye) {
                    object.push( { urlInstanceRestUrl: menu.urlInstanceRestUrl, entries: entry } );
                }
            }
        }
        return object;
    }

    getExternalMenus () {
        return this._getObject('epfl-external-menu');
    }

    getPages () {
        return this._getObject('page');
    }

    getPosts () {
        return this._getObject('post');
    }

    getCategories () {
        return this._getObject('category');
    }

    updateMenu(siteUrlSubstring: string, result: MenuEntry[]){
        let index = -1;
        for (let i = 0; i < this.menus.length; i++) {
            if (this.menus[i].urlInstanceRestUrl === siteUrlSubstring) {
                index = i;
                break;
            }
        }
        if (index > -1) {
            this.menus.splice(index, 1, { urlInstanceRestUrl: siteUrlSubstring, entries: result });
        } else {
            this.menus.push( { urlInstanceRestUrl: siteUrlSubstring, entries: result } );
        }
    }

    load(path: string) {
        this.menus = JSON.parse(fs.readFileSync(path, 'utf8'));
    }

    save(path: string) {
        writeRefreshFile(path,JSON.stringify(this.menus));
    }
}

function writeRefreshFile(path: string, json: string)  {
    try {
        fs.writeFile(path, json, (err) => {
            if (err) {
                error("Cache file not written: " + getErrorMessage(err), { url: path });
            } else {
                info('Successfully wrote file', { url: path, method: 'writeRefreshFile' });
            }
        });
    } catch (e) {
        error("Cache file not written: " + getErrorMessage(e), { url: path });
    }
}
