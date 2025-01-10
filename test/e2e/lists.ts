import 'mocha';
import {assert, expect} from "chai";
import {getMenuItems, getSiteTree} from "../../src/menus/lists";
import {configRefresh, initializeCachedMenus} from "../../src/menus/refresh";
import {loadConfig} from "../../src/utils/configFileReader";
import {configLinks} from "../../src/utils/links";

describe("End To End Menu", function() {
    beforeEach(function(done){
        const config = loadConfig('menu-api-config.yaml');
        if (config) {
            const pathRefreshFile = config?.PATH_REFRESH_FILE || ".";

            configRefresh(config);
            configLinks(config);

            initializeCachedMenus(pathRefreshFile);
            done();
        } else {
            throw new Error("Config not present");
        }
    });
    describe("Breadcrumb", function() {
        it('website has at least one parent', async function() {
            const items = getMenuItems("https://wp-httpd/campus/services/website/en/website/",
                "en", "breadcrumb", "page", "Systems updates feed",
                "https://wp-httpd/campus/services/website/blog-page/",
                "https://wp-httpd/campus/services/website/en/", "EPFL Websites").list;
            assert(items.length>1);
        });
        it('website has Services & Resources as parent', async function() {
            const items = getMenuItems("https://wp-httpd/campus/services/website/en/website/",
                "en", "breadcrumb", "page", "Systems updates feed",
                "https://wp-httpd/campus/services/website/blog-page/",
                "https://wp-httpd/campus/services/website/en/", "EPFL Websites").list;
            expect(items.find(f => f.title=='Services &amp; Resources')).not.be.undefined;
        });
        it('storage-of-documents has a specific parent', async function() {
            const items = getMenuItems("https://wp-httpd/campus/services/en/it-services/storage-of-documents/",
                "en", "breadcrumb", "page", "",
                "",
                "https://wp-httpd/campus/services/en", "Data Storage Solutions").list;
            expect(items.find(f => f.title=='Services &amp; Resources')).not.be.undefined;
        });
        it('website has Campus as parent', async function() {
            const items = getMenuItems("https://wp-httpd/campus/services/website/en/website/",
                "en", "breadcrumb", "page", "Systems updates feed",
                "https://wp-httpd/campus/services/website/blog-page/",
                "https://wp-httpd/campus/services/website/en/", "EPFL Websites").list;
            expect(items.find(f => f.title=='Campus')).not.be.undefined;
        });
        it('laboratories has no Lab parent', async function() {
            const items = getMenuItems("https://wp-httpd/labs/en/laboratories/",
                "en", "breadcrumb", "page", "", "",
                "", "").list;
            assert(items.length == 1);
        });
        it('Alice has Labs as parent', async function() {
            const items = getMenuItems("https://wp-httpd/labs/alice/en/index-fr-html/",
                "en", "breadcrumb", "page", "", "",
                "", "").list;
            assert(items.length == 2);
            expect(items.find(f => f.url == 'https://wp-httpd/labs/en/laboratories/')).not.be.undefined;
        });
        it('all-associations has Student Assoc and campus as parents', async function() {
            const items = getMenuItems("https://wp-httpd/campus/associations/list/en/all-associations/",
                "en", "breadcrumb", "page", "", "",
                "", "").list;
            expect(items.find(f => f.url == 'https://wp-httpd/campus/associations/en/student-associations/')).not.be.undefined;
            expect(items.find(f => f.url == 'https://wp-httpd/campus/en/campusenglish/')).not.be.undefined;
        });
        it('spaceyourservice has Assoc as parent', async function() {
            const items = getMenuItems("https://wp-httpd/campus/associations/list/spaceat/en/spaceyourservice/",
                "en", "breadcrumb", "page", "", "",
                "", "").list;
            assert(items.length == 4);
            expect(items.find(f => f.url == 'https://wp-httpd/campus/associations/list/en/all-associations/')).not.be.undefined;
        });
        it('adec assoc has campus in parents', async function() {
            const items = getMenuItems("https://wp-httpd/campus/associations/list/adec/index-html/the-comitee/",
                "en", "breadcrumb", "page", "", "",
                "", "").list;
            assert(items.length == 5);
            expect(items.find(f => f.url == 'https://wp-httpd/campus/en/campusenglish/')).not.be.undefined;
        });
        it('has one list assoc item', async function() {
            const items = getMenuItems("https://wp-httpd/campus/associations/list/en/all-associations/",
                "en", "breadcrumb", "page", "", "",
                "", "").list;
            assert(items.filter(f => f.url == 'https://wp-httpd/campus/associations/list/en/all-associations/').length == 1);
        });
    });
    describe("Siblings", function() {
        it('a site has siblings', async function() {
            const items = getMenuItems("https://wp-httpd/campus/services/website/support-courses-web-workshop/",
                "en", "siblings", "page", "", "",
                "", "").list;
            assert(items.length>1);
        });
        it('a site has a specific sibling', async function() {
            const items = getMenuItems("https://wp-httpd/campus/services/website/support-courses-web-workshop/",
                "en", "siblings", "page", "", "",
                "", "").list;
            expect(items.find(f => f.title=='Close a website')).not.be.undefined;
        });
        it("doesn't contain external menus", async function() {
            const items = getMenuItems("https://wp-httpd/campus/services/en/campusenglish/",
                "en", "siblings", "page", "", "",
                "", "").list;
            assert.deepEqual(items.filter(f => f.object=='epfl-external-menu'), []);
        });
        it('has Room Reservations as sibling', async function() {
            const items = getMenuItems("https://wp-httpd/campus/services/en/it-services/storage-of-documents/",
                "en", "siblings", "page", "", "",
                "", "").list;
            expect(items.find(f => f.url=='https://wp-httpd/campus/services/en/it-services/room-reservations/')).not.be.undefined;
        });
        it('Services has Art&Culture as sibling', async function() {
            const items = getMenuItems("https://wp-httpd/campus/services/en/homepage/",
                "en", "siblings", "page", "", "",
                "", "").list;
            expect(items.find(f => f.url=='https://wp-httpd/campus/art-culture/en/art-culture/')).not.be.undefined;
        });
        it('laptop has smartphone as sibling', async function() {
            const items = getMenuItems("https://wp-httpd/campus/services/en/it-services/security-it/loss-of-laptop/",
                "en", "siblings", "page", "", "",
                "", "").list;
            expect(items.find(f => f.url=='https://wp-httpd/campus/services/en/it-services/security-it/loss-of-smartphone/')).not.be.undefined;
        });
        it('has 7 siblings in the level 0', async function() {
            const items = getMenuItems("https://wp-httpd/campus/en/campusenglish/",
                "en", "siblings", "page", "", "",
                "", "").list;
            assert(items.length == 7);
        });
        it('italian language has breadcrumb in english', async function() {
            const items = getMenuItems("https://wp-httpd/campus/services/it/test-italiano/",
                "it", "breadcrumb", "page", "", "",
                "", "").list;
            assert(items.length > 1);
        });
        it('crc is the child of IT Services & Resources', async function () {
            const config = loadConfig('menu-api-config.yaml');
            const items = getMenuItems("https://wp-httpd/campus/services/en/it-services/",
                "en", "siblings", "page", "", "",
                "https://wp-httpd/campus/services/en/", "IT Services & Resources").list;
            assert(items.length > 1);
        });
    });


    describe("ChildrenSite", function() {
        it('campus has some children', async function () {
            const config = loadConfig('menu-api-config.yaml');
            const items = await getSiteTree("https://wp-httpd.epfl.ch/campus/",
                config);
            assert(items.children.length > 1);
        });
        it('campus has some children without /', async function () {
            const config = loadConfig('menu-api-config.yaml');
            const items = await getSiteTree("https://wp-httpd.epfl.ch/campus",
                config);
            assert(items.children.length > 1);
        });
        it('campus has association as child', async function () {
            const config = loadConfig('menu-api-config.yaml');
            const items = await getSiteTree("https://wp-httpd.epfl.ch/campus/",
                config);
            const filteredList = items.children.filter(site => site.href == "https://wp-httpd.epfl.ch/campus/associations/");
            assert(filteredList.length == 1);
        });
        it('campus doesn\'t have association/list as child', async function () {
            const config = loadConfig('menu-api-config.yaml');
            const items = await getSiteTree("https://wp-httpd.epfl.ch/campus/",
                config);
            const filteredList = items.children.filter(site => site.href == "https://wp-httpd.epfl.ch/campus/associations/list/");
            assert(filteredList.length == 0);
        });
        it('campus doesn\'t have association/list as child', async function () {
            const config = loadConfig('menu-api-config.yaml');
            const items = await getSiteTree("https://wp-httpd.epfl.ch/campus/associations",
                config);
            const filteredList = items.children.filter(site => site.href == "https://wp-httpd.epfl.ch/campus/associations/list/");
            assert(filteredList.length == 1);
        });
        it('campus is the parent of association', async function () {
            const config = loadConfig('menu-api-config.yaml');
            const items = await getSiteTree("https://wp-httpd.epfl.ch/campus/associations",
                config);
            const filteredList = items.parent.filter(site => site.href == "https://wp-httpd.epfl.ch/campus/");
            assert(filteredList.length == 1);
        });
    });
});
