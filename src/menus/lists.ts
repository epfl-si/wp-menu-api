import {WpMenu} from "../interfaces/wpMenu";
import {SiteTreeInstance} from "../interfaces/siteTree";
import {getArraySiteTreeByLanguage} from "./refresh";
import {error, info} from "../utils/logger";
import {getAssocLink, getLabsLink} from "../utils/links";

function searchAllParentsEntriesByID(entry: WpMenu, urlInstanceRestUrl: string, siteArray: SiteTreeInstance, labLink: string, assocLink: string): WpMenu[] {
    const parent: { [urlInstance : string]: WpMenu } | undefined = siteArray.getParent(urlInstanceRestUrl,entry.ID);

    if (parent) {
        const newUrl = Object.keys(parent)[0];

        if (parent[newUrl]) {
            const parents: WpMenu[] = searchAllParentsEntriesByID(parent[newUrl], newUrl , siteArray, labLink, assocLink);
            return [...parents, parent[newUrl]];
        } else {
            return searchParent(urlInstanceRestUrl, siteArray, entry, labLink, assocLink);
        }
    } else {
        return searchParent(urlInstanceRestUrl,siteArray, entry, labLink, assocLink);
    }
}

function searchParent(url: string, siteArray: SiteTreeInstance, entry: WpMenu, labLink: string, assocLink: string) {
    if (url.indexOf("/labs/") >- 1 && entry.url !== labLink) {
        return getLabOrAssoc(labLink, siteArray);
    } else if (url.indexOf('/associations/list/') >- 1 && entry.url !== assocLink) {
        return getLabOrAssoc(assocLink, siteArray);
    } else {
        info('Start getting breadcrumb: not parent present with this url', {url: url, method: 'searchAllParentsEntriesByID'});
        return [];
    }
}

function getLabOrAssoc(url: string, siteArray: SiteTreeInstance) {
    const labsOrAssoc: { [urlInstance : string]: WpMenu } | undefined = siteArray.findItemByUrl(url);
    if (labsOrAssoc) {
        const labUrl = Object.keys(labsOrAssoc)[0];
        if (labsOrAssoc[labUrl]) {
            return [labsOrAssoc[labUrl]];
        } else {
            return [];
        }
    } else {
        return [];
    }
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
                switch ( type ) {
                    case "siblings":
                        items = siteArray.getSiblings(restUrl,firstSite[restUrl].ID);
                        const  levelZeroUrls: string[] = [
                            'https://www.epfl.ch/campus/en/campusenglish/',
                            'https://www.epfl.ch/about/en/about/',
                            'https://www.epfl.ch/education/en/education-2/',
                            'https://www.epfl.ch/research/en/research/',
                        'https://www.epfl.ch/innovation/en/innovation-4/',
                        '']
                        break;
                    case "breadcrumb":
                        console.log('first site',firstSite[restUrl]);
                        const labLink = getLabsLink(lang);
                        const assocLink = getAssocLink(lang);
                        items = [...searchAllParentsEntriesByID(firstSite[restUrl], restUrl, siteArray, labLink, assocLink), firstSite[restUrl]];
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
