import {SiteTreeMutable} from "../interfaces/siteTree";

export class MenusCache {
	private cachedMenus: {[lang: string]: SiteTreeMutable } = {}

	get menus() {
		return this.cachedMenus;
	}
}
