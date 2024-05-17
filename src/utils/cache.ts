import {SiteTreeMutable} from "../interfaces/siteTree";
import {error, getErrorMessage, info, refresh_memory_array_size} from "./logger";

export class MenusCache {
	private cachedMenus: {[lang: string]: SiteTreeMutable } = {
		fr: new SiteTreeMutable(),
		en: new SiteTreeMutable(),
		de: new SiteTreeMutable()
	}

	get menus() {
		return this.cachedMenus;
	}

	read(path: string){
		info('Start reading from file', { url: path, method: 'MenusCache.read'});
		try {
			for (const lang in this.cachedMenus) {
				if (this.cachedMenus.hasOwnProperty(lang)) {
					this.cachedMenus[lang].load(path.concat('/menus_' + lang + '.json'));
				}
			}
		} catch (e) {
			error(getErrorMessage(e), { url: path, method: 'MenusCache.read'});
		}
	}

	write(path: string){
		for (const lang in this.cachedMenus) {
			if (this.cachedMenus.hasOwnProperty(lang)) {
				this.cachedMenus[lang].save(path.concat('/menus_' + lang + '.json'));
			}
		}
	}

	checkCache(){
		for (const lang in this.cachedMenus) {
			if (this.cachedMenus.hasOwnProperty(lang)) {
				refresh_memory_array_size.labels({arrayName: '/menus_' + lang}).set(this.cachedMenus[lang].length);
			}
		}
	}

	lock(){}
}
