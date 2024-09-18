import {MenuEntry} from "./MenuEntry";

interface SiteTreeInstance  {
    getParent : (urlInstanceRestUrl: string,  idChild: number) => { [urlInstance : string]: MenuEntry } | undefined
    getChildren : (urlInstanceRestUrl: string, idParent: number) => MenuEntry[]
    findExternalMenuByRestUrl : (urlInstanceRestUrl: string) => MenuEntry | undefined
    findItemByRestUrlAndId: (urlInstanceRestUrl: string, idItem: number) => MenuEntry | undefined
    getSiblings : (urlInstanceRestUrl: string, idItem: number) => MenuEntry[]
    findItemByUrl: (pageURL: string) => { [urlInstance: string]: MenuEntry } | undefined
}

type SiteTreeConstructor = (menus : { urlInstanceRestUrl: string, entries: MenuEntry[] | undefined }[]) => SiteTreeInstance

export const SiteTree : SiteTreeConstructor;
