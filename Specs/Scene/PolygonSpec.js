defineSuite([
         'Scene/Polygon',
         '../Specs/createContext',
         '../Specs/destroyContext',
         '../Specs/sceneState',
         '../Specs/pick',
         'Core/Cartesian3',
         'Core/Cartographic3',
         'Core/Ellipsoid',
         'Core/Matrix4',
         'Core/Math',
         'Renderer/BufferUsage'
     ], function(
         Polygon,
         createContext,
         destroyContext,
         sceneState,
         pick,
         Cartesian3,
         Cartographic3,
         Ellipsoid,
         Matrix4,
         CesiumMath,
         BufferUsage) {
    "use strict";
    /*global it,expect,beforeEach,afterEach*/

    var context;
    var polygon;
    var us;

    beforeEach(function() {
        context = createContext();
        polygon = new Polygon();

        var camera = {
            eye : new Cartesian3(1.02, 0.0, 0.0),
            target : Cartesian3.getZero(),
            up : Cartesian3.getUnitZ()
        };
        us = context.getUniformState();
        us.setView(Matrix4.createLookAt(camera.eye, camera.target, camera.up));
        us.setProjection(Matrix4.createPerspectiveFieldOfView(CesiumMath.toRadians(60.0), 1.0, 0.01, 10.0));
    });

    afterEach(function() {
        polygon = polygon && polygon.destroy();
        us = null;

        destroyContext(context);
    });

    it("gets default show", function() {
        expect(polygon.show).toBeTruthy();
    });

    it("sets positions", function() {
        var positions = [
                         new Cartesian3(1.0, 2.0, 3.0),
                         new Cartesian3(4.0, 5.0, 6.0),
                         new Cartesian3(7.0, 8.0, 9.0)
                        ];

        expect(polygon.getPositions()).toBeNull();

        polygon.setPositions(positions);
        expect(polygon.getPositions()).toEqualArray(positions);
    });

    it("gets the default color", function() {
        expect(polygon.material.color).toEqualProperties({
            red : 1.0,
            green : 1.0,
            blue : 0.0,
            alpha : 0.5
        });
    });

    it("gets default buffer usage", function() {
        expect(polygon.bufferUsage).toEqual(BufferUsage.STATIC_DRAW);
    });

    it("has a default ellipsoid", function() {
        expect(polygon.ellipsoid).toEqual(Ellipsoid.getWgs84());
    });

    it("gets the default granularity", function() {
        expect(polygon.granularity).toEqual(CesiumMath.toRadians(1.0));
    });

    it("renders", function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.

        var ellipsoid = Ellipsoid.getUnitSphere();
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.setPositions([
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(-50.0, -50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(50.0, -50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(50.0, 50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(-50.0, 50.0, 0.0)))
                             ]);
        polygon.material.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
    });

    it("doesn't renders", function() {
        var ellipsoid = Ellipsoid.getUnitSphere();
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.setPositions([
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(-50.0, -50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(50.0, -50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(50.0, 50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(-50.0, 50.0, 0.0)))
                             ]);
        polygon.material.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };
        polygon.show = false;

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);
    });

    it("is picked", function() {
        var ellipsoid = Ellipsoid.getUnitSphere();
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.setPositions([
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(-50.0, 50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(50.0, 50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(50.0, -50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(-50.0, -50.0, 0.0)))
                             ]);

        polygon.update(context, sceneState);

        var pickedObject = pick(context, polygon, 0, 0);
        expect(pickedObject).toEqual(polygon);
    });

    it("is not picked", function() {
        var ellipsoid = Ellipsoid.getUnitSphere();
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.setPositions([
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(-50.0, -50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(50.0, -50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(50.0, 50.0, 0.0))),
                              ellipsoid.toCartesian(CesiumMath.cartographic3ToRadians(new Cartographic3(-50.0, 50.0, 0.0)))
                             ]);
        polygon.show = false;

        polygon.update(context, sceneState);

        var pickedObject = pick(context, polygon, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });
});