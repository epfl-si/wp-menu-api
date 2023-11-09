import 'mocha';
import {expect} from "chai";
import {refreshMenu} from "../../src/menus/refresh";

describe("End To End Menu Refresh", function() {
    it('refresh has no errors', async function() {
        const errors = await refreshMenu();
        expect(errors).to.be.empty;
    });
});
