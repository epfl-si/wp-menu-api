import {WpMenu} from "../interfaces/wpMenu";
import {SiteTreeInstance} from "../interfaces/siteTree";
import {Refresh} from "./refresh";

export class Lists {

    static searchAllParentsEntriesByID = (entry: WpMenu, urlInstanceRestUrl: string, siteArray: SiteTreeInstance): WpMenu[] => {
        const parent: { [urlInstance : string]: WpMenu } | undefined = siteArray.getParent(urlInstanceRestUrl,entry.ID);
        console.log('urlInstanceRestUrl', urlInstanceRestUrl);
        if (parent) {
            const newUrl = Object.keys(parent)[0];
            console.log('newUrl', newUrl);
            if (parent[newUrl]) {
                const parents: WpMenu[] = this.searchAllParentsEntriesByID(parent[newUrl], newUrl , siteArray);
                return [...parents, parent[newUrl]];
            }else {
                return [];
            }
        } else {
            return [];
        }
    }

    static getMenuItems(url: string, lang: string, type: string) : WpMenu[] {
        let items: WpMenu[] = [];

        let siteArray: SiteTreeInstance | undefined = Refresh.getArraySiteTreeByLanguage(lang);
        if (siteArray) {
            let firstSite: { [urlInstance: string]: WpMenu } | undefined = siteArray.findItemByUrl(url);
            if (firstSite) {
                const restUrl = Object.keys(firstSite)[0];
                if (firstSite[restUrl]) {
                    console.log('first site : ',firstSite[restUrl]);
                    switch ( type ) {
                        case "siblings":
                            items = siteArray.getSiblings(restUrl,firstSite[restUrl].ID);
                            break;
                        case "breadcrumb":
                            console.log('first site breadcrumb',firstSite[restUrl], '::::restUrl:', restUrl)
                            items = [...this.searchAllParentsEntriesByID(firstSite[restUrl], restUrl, siteArray)];
                            break;
                    }
                }
            }
        }
        return items;
    }
}