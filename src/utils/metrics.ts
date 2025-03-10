import {total_categories, total_pages, total_posts, total_retrieved_sites,} from "./logger";
import {MenuEntry} from "../interfaces/MenuEntry";
import {SiteTreeReadOnlyByLanguage} from "./siteTreeByLanguage";

export function getRetrievedSitesCount(menus: SiteTreeReadOnlyByLanguage) {
	for (const lang in menus.menus) {
		if (menus.menus.hasOwnProperty(lang)) {
			total_retrieved_sites.labels({lang: lang}).set(menus.menus[lang].length());
		}
	}
}

export function getPagesCount(menus: SiteTreeReadOnlyByLanguage) {
	for (const lang in menus.menus) {
		if (menus.menus.hasOwnProperty(lang)) {
			const groupedBySite = getGroupedArray(menus.menus[lang].getPages())
			for (const site in groupedBySite) {
				if (groupedBySite.hasOwnProperty(site)) {
					total_pages.labels({lang: lang, site: site}).set(groupedBySite[site].length);
				}
			}
		}
	}
}

export function getPostsCount(menus: SiteTreeReadOnlyByLanguage) {
	for (const lang in menus.menus) {
		if (menus.menus.hasOwnProperty(lang)) {
			const groupedBySite = getGroupedArray(menus.menus[lang].getPosts())
			for (const site in groupedBySite) {
				if (groupedBySite.hasOwnProperty(site)) {
					total_posts.labels({lang: lang, site: site}).set(groupedBySite[site].length);
				}
			}
		}
	}
}

export function getCategoriesCount(menus: SiteTreeReadOnlyByLanguage) {
	for (const lang in menus.menus) {
		if (menus.menus.hasOwnProperty(lang)) {
			const groupedBySite = getGroupedArray(menus.menus[lang].getCategories())
			for (const site in groupedBySite) {
				if (groupedBySite.hasOwnProperty(site)) {
					total_categories.labels({lang: lang, site: site}).set(groupedBySite[site].length);
				}
			}
		}
	}
}

function getGroupedArray(pages: {urlInstanceRestUrl: string, entries: MenuEntry}[]) {
	return pages.reduce((grouped: { [site: string]: MenuEntry[] }, page: { urlInstanceRestUrl: string, entries: MenuEntry }) => {
		const site = cleanUrl(page.urlInstanceRestUrl);
		if (!grouped[site]) {
			grouped[site] = [];
		}
		grouped[site].push(page.entries);
		return grouped;
	}, {});
}

function cleanUrl(site: string) {
	let subUrl = site;
	if (site.indexOf("wp-json") > -1) {
		subUrl = site.substring(site.indexOf("wp-json") + 7);
	}
	return subUrl;
}
