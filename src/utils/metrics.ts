import fs from "fs";
import {
	refresh_files_size,
	total_categories,
	total_pages,
	total_posts,
	total_retrieved_sites,
	total_WPV_sites
} from "./logger";
import {getCachedMenus} from "../menus/refresh";
import {Site} from "../interfaces/site";
import {MenusCache} from "./cache";
import {WpMenu} from "../interfaces/wpMenu";

function checkRefreshFile(pathRefreshFile: string) {
	for (const lang in getCachedMenus()) {
		if (fs.existsSync(pathRefreshFile.concat('/menus_' + lang + '.json'))) {
			refresh_files_size.labels({fileName: '/menus_' + lang + '.json'}).set(fs.statSync(pathRefreshFile.concat('/menus_' + lang + '.json')).size);
		} else {
			refresh_files_size.labels({fileName: '/menus_' + lang + '.json'}).set(0);
		}
	}
}

export function prometheusChecks(pathRefreshFile: string) {
	checkRefreshFile(pathRefreshFile);
	getCachedMenus().checkCache();
}

export function getWPVeritasSitesForEnvironment(filteredListOfSites: Site[]) {
	const groupedByOpenShiftEnvironment = filteredListOfSites.reduce((acc, item) => {
		if (!acc[item.openshiftEnv]) {
			acc[item.openshiftEnv] = [];
		}
		acc[item.openshiftEnv].push(item);
		return acc;
	}, {} as Record<string, Site[]>);
	for (const category in groupedByOpenShiftEnvironment) {
		if (groupedByOpenShiftEnvironment.hasOwnProperty(category)) {
			total_WPV_sites.labels({openshiftEnvironment: category}).set(groupedByOpenShiftEnvironment[category].length);
		}
	}
}

export function getRetrievedSitesCount(cachedMenus: MenusCache) {
	for (const lang in cachedMenus.menus) {
		if (cachedMenus.menus.hasOwnProperty(lang)) {
			total_retrieved_sites.labels({lang: lang}).set(cachedMenus.menus[lang].length);
		}
	}
}

export function getPagesCount(cachedMenus: MenusCache) {
	for (const lang in cachedMenus.menus) {
		if (cachedMenus.menus.hasOwnProperty(lang)) {
			const groupedBySite = getGroupedArray(cachedMenus.menus[lang].getPages())
			for (const site in groupedBySite) {
				if (groupedBySite.hasOwnProperty(site)) {
					total_pages.labels({lang: lang, site: site}).set(groupedBySite[site].length);
				}
			}
		}
	}
}

export function getPostsCount(cachedMenus: MenusCache) {
	for (const lang in cachedMenus.menus) {
		if (cachedMenus.menus.hasOwnProperty(lang)) {
			const groupedBySite = getGroupedArray(cachedMenus.menus[lang].getPosts())
			for (const site in groupedBySite) {
				if (groupedBySite.hasOwnProperty(site)) {
					total_posts.labels({lang: lang, site: site}).set(groupedBySite[site].length);
				}
			}
		}
	}
}

export function getCategoriesCount(cachedMenus: MenusCache) {
	for (const lang in cachedMenus.menus) {
		if (cachedMenus.menus.hasOwnProperty(lang)) {
			const groupedBySite = getGroupedArray(cachedMenus.menus[lang].getCategories())
			for (const site in groupedBySite) {
				if (groupedBySite.hasOwnProperty(site)) {
					total_categories.labels({lang: lang, site: site}).set(groupedBySite[site].length);
				}
			}
		}
	}
}

function getGroupedArray(pages: {urlInstanceRestUrl: string, entries: WpMenu}[]) {
	return pages.reduce((grouped: { [site: string]: WpMenu[] }, page: { urlInstanceRestUrl: string, entries: WpMenu }) => {
		const site = page.urlInstanceRestUrl;
		if (!grouped[site]) {
			grouped[site] = [];
		}
		grouped[site].push(page.entries);
		return grouped;
	}, {});
}
