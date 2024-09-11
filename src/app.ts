class MenuInventory {
    wpVeritasUrl : string;

    constructor (wpVeritasUrl : string) {
        this.wpVeritasUrl = wpVeritasUrl;
    }
    async sites () {
        const resp = await fetch(this.wpVeritasUrl);
        const data = await resp.json();
        console.log(data);
        return data;  // XXX
    }
}

async function main () {
    const inv = new MenuInventory("https://wp-veritas.epfl.ch/api/v1/sites");
    console.log(await inv.sites());
}

main();
