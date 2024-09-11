abstract class MenuEntry {

    ownerSite: Site;
    title: string;

    constructor (ownerSite: Site, jsonDatum: any) {
        this.ownerSite = ownerSite;
        this.title = jsonDatum.title;
    }

    static parse (ownerSite: Site, jsonDatum : any) : MenuEntry {
        for (let cls of [PageMenuEntry, ExternalMenuEntry, OtherMenuEntry]) {
            const parsed = cls.tryToParse(ownerSite, jsonDatum);
            if (parsed) return parsed;
        }

        throw new TypeError(`Decidedly don't know how to parse ${JSON.stringify(jsonDatum)}`);
    }

    getTitle(): string {
        return this.title;
    }
    getSite(): Site {
        return this.ownerSite;
    }

    abstract getFullUrl() : string;
}

class ExternalMenuEntry extends MenuEntry {
    restUrl: string;
    constructor (ownerSite : Site, jsonDatum : any) {
        super(ownerSite, jsonDatum);
        this.restUrl = jsonDatum.rest_url;
    }

    static tryToParse (ownerSite : Site, jsonDatum : any) : ExternalMenuEntry | undefined {
        if (jsonDatum.object === "epfl-external-menu") {
            return new ExternalMenuEntry(ownerSite, jsonDatum);
        }
    }

    getFullUrl() {
        return `${this.ownerSite.getDomainUrl()}${this.restUrl}`;
    }
}

class PageMenuEntry extends MenuEntry {
    url: string;
    constructor (ownerSite : Site, jsonDatum : any) {
        super(ownerSite, jsonDatum);
        this.url = jsonDatum.url;
    }

    static tryToParse (ownerSite : Site, jsonDatum : any) : PageMenuEntry | undefined {
        if (jsonDatum.object === "page") {
            return new PageMenuEntry(ownerSite, jsonDatum);
        }
    }

    getFullUrl() {
        return this.url;
    }
}

class OtherMenuEntry extends MenuEntry {
    static tryToParse (ownerSite : Site, jsonDatum : any) : OtherMenuEntry | undefined {
        return new OtherMenuEntry(ownerSite, jsonDatum);
    }

    getFullUrl() { return "(Not sure)"; }
}

class Site {
    url: string;

    constructor (url : string) {
        this.url = url;
    }
    getUrl() : string {
        return this.url;
    }

    getDomainUrl() : string {
        return 'https://' + URL.parse(this.url)!.hostname;
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
            return menusItemsStruct.items.map(m => MenuEntry.parse(this, m));
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
                console.log(`${site} has language ${lang} and this menu: ${m.getTitle()} -> ${m.getFullUrl()}`);
            })
        }
    }
}

main();
