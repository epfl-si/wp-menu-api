import 'mocha';
import {assert, expect} from "chai";
import {Refresh} from "../src/menus/refresh";
import {Lists} from "../src/menus/lists";

describe("End To End", function() {
    it('refresh has no errors', async function() {
        const errors = await Refresh.refreshMenu();
        expect(errors).to.be.empty;
    });
    it('breadcrumb has at list one parent', async function() {
        const items = Lists.getMenuItems("http://wp-httpd/campus/services/website/", "en", "breadcrumb");
        assert(items.length>1);
    });
    it('breadcrumb has a specific parent', async function() {
        const items = Lists.getMenuItems("http://wp-httpd/campus/services/website/", "en", "breadcrumb");
        expect(items.find(f => f.title=='Services &amp; Resources')).not.be.undefined;
    });
    it('a site has siblings', async function() {
        const items = Lists.getMenuItems("http://wp-httpd/campus/services/website/support-courses-web-workshop/", "en", "siblings");
        assert(items.length>1);
    });
    it('a site has a specific sibling', async function() {
        const items = Lists.getMenuItems("http://wp-httpd/campus/services/website/support-courses-web-workshop/", "en", "siblings");
        expect(items.find(f => f.title=='Close a website')).not.be.undefined;
    });
});