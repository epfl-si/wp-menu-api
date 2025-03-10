import {SiteTreeInstance, SiteTreeMutable} from "../interfaces/siteTree";

export class SiteTreeMutableByLanguage {
	private siteTreeMutableByLanguage: {[lang: string]: SiteTreeMutable } = {}

	get menus() {
		return this.siteTreeMutableByLanguage;
	}
}

export class SiteTreeReadOnlyByLanguage {
	private siteTreeMutableByLanguage: {[lang: string]: SiteTreeInstance } = {}

	get menus() {
		return this.siteTreeMutableByLanguage;
	}
}
