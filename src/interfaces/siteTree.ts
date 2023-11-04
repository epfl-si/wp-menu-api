import {WpMenu} from "./wpMenu";
import {MenuAPIResult} from "./menuAPIResult";

export interface SiteTreeInstance  {
    getParent : (urlInstanceRestUrl: string,  idChild: number) => { [urlInstance : string]: WpMenu } | undefined
    getChildren : (urlInstanceRestUrl: string, idParent: number) => WpMenu[]
    findExternalMenuByRestUrl : (urlInstanceRestUrl: string) => WpMenu | undefined
    findItemByRestUrlAndId: (urlInstanceRestUrl: string, idItem: number) => WpMenu | undefined
    getSiblings : (urlInstanceRestUrl: string, idItem: number) => WpMenu[]
    findItemByUrl: (pageURL: string) => { [urlInstance: string]: WpMenu } | undefined
}

export type SiteTreeConstructor = (menus : { urlInstanceRestUrl: string, entries: WpMenu[] | undefined }[]) => SiteTreeInstance

export const SiteTree : SiteTreeConstructor = function(menus) {
    const itemsByID : { [urlInstanceRestUrl : string]: { [idItem : number]: WpMenu } } = {};
    const parents: { [urlInstanceRestUrl : string]: { [idChild : number]: WpMenu } } = {};
    const children: { [urlInstanceRestUrl : string]: { [idParent : number]: WpMenu[] } } = {};

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
        getParent(urlInstanceRestUrl: string, idChild:number): { [urlInstance : string]: WpMenu } {
            const result: { [urlInstance: string]: WpMenu } = {};
            const parent = parents[urlInstanceRestUrl][idChild];//it could be undefined;
            if (parent === undefined) {
                for (const url in itemsByID) {
                    const items = itemsByID[url];
                    for (const id in items) {
                        const item = itemsByID[url][id];
                        if (item.object === "epfl-external-menu" && item.rest_url === urlInstanceRestUrl){
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
            return childrenInTheSameSite.map(child => {
                if (child.object === 'epfl-external-menu'){
                    const foundExternalMenu = this.findExternalMenuByRestUrl(child.rest_url!);
                    if (foundExternalMenu) {
                        return foundExternalMenu;
                    }
                }
                return child;//for normal menus or external not found menus
            });
        },
        getSiblings(urlInstanceRestUrl: string, idItem:number)  {
            const parent = this.getParent(urlInstanceRestUrl,idItem);
            if (parent) {
                const newUrl = Object.keys(parent)[0];
                if (parent[newUrl]) {
                    const children = this.getChildren(newUrl,parent[newUrl].ID);
                    return children.filter(menu => menu.ID!=idItem);
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
            const result: { [urlInstance: string]: WpMenu } = {};
            for (const url in itemsByID) {
                console.log("urlItems", url);
                const items = itemsByID[url];
                for (const id in items) {
                    const item = itemsByID[url][id];
                    if (item.url && item.url===pageURL){
                        result[url] = item;
                        return result;
                    }
                }
            }
            return undefined;
        }
    }
}
