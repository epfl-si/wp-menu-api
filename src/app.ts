class MenuEntry {

    title: string;
    ownerSite: Site;
    relativeRestURI: string;

    constructor (ownerSite: Site, title: string, relativeRestURI: string) {
        this.title = title;
        this.ownerSite = ownerSite;
        this.relativeRestURI = relativeRestURI;

    }
    getTitle(): string {
        return this.title;
    }
    getSite(): Site {
        return this.ownerSite;
    }
    getFullUrl(): string {

    }
}

class Site {
    url: string;

    constructor (url : string) {
        this.url = url;
    }
    getUrl() : string {
        return ""
    }
    async getLanguages(): Promise<string[]> {
        const langApiResponse = await fetch(`${this.url}/wp-json/epfl/v1/languages`);
        try {
            return await langApiResponse.json();
        } catch (SyntaxError) {
            return [];
        }
    }

    async getMenuEntries(lang: string): Promise<MenuEntry[]>{
        const menusApiResponse = await fetch(`${this.url}wp-json/epfl/v1/menus/top?lang=${lang}`);
            const menusItemsStruct: {items:any[]} =  await menusApiResponse.json();
            return menusItemsStruct.items.map(m => new MenuEntry(this, m.title, m.rest_url));
    }

    get [Symbol.toStringTag]() {
        return `<Site url="${this.url}">`;
    }
}

class MenuInventory {
    wpVeritasUrl : string;

    constructor (wpVeritasUrl : string) {
        this.wpVeritasUrl = wpVeritasUrl;
    }
    async sites () {
        const resp = await fetch(this.wpVeritasUrl);
        const inventory: any[] = await resp.json();
        const arraySites = inventory.map(i =>  new Site(i.url))
        return arraySites;
    }
}

async function main () {
    const inv = new MenuInventory("https://wp-veritas.epfl.ch/api/v1/sites");

    for (let site of await inv.sites()) {
        for (let lang of await site.getLanguages()) {
            const menus = await site.getMenuEntries(lang);
            menus.map(m => {
                console.log(`${site} has language ${lang} and this menu: ${m.getTitle()}`);
            })
        }
    }
}

main();
