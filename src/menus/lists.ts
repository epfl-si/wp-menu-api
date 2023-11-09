import {WpMenu} from "../interfaces/wpMenu";
import {SiteTreeInstance} from "../interfaces/siteTree";
import {getArraySiteTreeByLanguage} from "./refresh";


function searchAllParentsEntriesByID(entry: WpMenu, urlInstanceRestUrl: string, siteArray: SiteTreeInstance): WpMenu[] {
    const parent: { [urlInstance : string]: WpMenu } | undefined = siteArray.getParent(urlInstanceRestUrl,entry.ID);

    if (parent) {
        const newUrl = Object.keys(parent)[0];

        if (parent[newUrl]) {
            const parents: WpMenu[] = searchAllParentsEntriesByID(parent[newUrl], newUrl , siteArray);
            return [...parents, parent[newUrl]];
        } else {
            return [];
        }
    } else {
        return [];
    }
}

export function getMenuItems (url: string, lang: string, type: string) : WpMenu[] {
    let items: WpMenu[] = [];
    let siteArray: SiteTreeInstance | undefined = getArraySiteTreeByLanguage(lang);

    if (siteArray) {
        let firstSite: { [urlInstance: string]: WpMenu } | undefined = siteArray.findItemByUrl(url);

        if (firstSite) {
            const restUrl = Object.keys(firstSite)[0];

            if (firstSite[restUrl]) {
                switch ( type ) {
                    case "siblings":
                        items = siteArray.getSiblings(restUrl,firstSite[restUrl].ID);
                        break;
                    case "breadcrumb":
                        items = [...searchAllParentsEntriesByID(firstSite[restUrl], restUrl, siteArray)];
                        break;
                }
            }
        }
    }

    return items;
}
