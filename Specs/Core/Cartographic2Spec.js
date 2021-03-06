defineSuite([
         'Core/Cartographic2',
         'Core/Cartographic3'
     ], function(
         Cartographic2,
         Cartographic3) {
    "use strict";
    /*global it,expect*/

    it("construct0", function() {
        var c = new Cartographic2();
        expect(c.longitude).toEqual(0);
        expect(c.latitude).toEqual(0);
    });

    it("construct1", function() {
        var c = new Cartographic2(new Cartographic3(1, 2, 3));
        expect(c.longitude).toEqual(1);
        expect(c.latitude).toEqual(2);
    });

    it("construct2", function() {
        var c = new Cartographic2(1, 2);
        expect(c.longitude).toEqual(1);
        expect(c.latitude).toEqual(2);
    });

    it("getZero", function() {
        var c = new Cartographic2.getZero();
        expect(c.longitude).toEqual(0);
        expect(c.latitude).toEqual(0);
    });

    it("clones itself", function() {
        var c = new Cartographic2(0, 1);
        var c2 = c.clone();
        expect(c.equals(c2)).toBeTruthy();

        ++c2.latitude;
        expect(c.equals(c2)).toBeFalsy();
    });

    it("equalsEpsilon", function() {
        expect(new Cartographic2(1, 2).equalsEpsilon(new Cartographic2(1, 2), 0)).toBeTruthy();
        expect(new Cartographic2(1, 2).equalsEpsilon(new Cartographic2(2, 2), 1)).toBeTruthy();
        expect(new Cartographic2(1, 2).equalsEpsilon(new Cartographic2(3, 2), 1)).toBeFalsy();
    });

    it("toString", function() {
        var c = new Cartographic2(1, 2);
        expect(c.toString()).toEqual("(1, 2)");
    });
});