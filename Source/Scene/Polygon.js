/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/combine',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/AxisAlignedBoundingRectangle',
        '../Core/Cartesian3',
        '../Core/ComponentDatatype',
        '../Core/MeshFilters',
        '../Core/PrimitiveType',
        '../Core/EllipsoidTangentPlane',
        '../Core/PolygonPipeline',
        '../Core/WindingOrder',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        '../Renderer/CullFace',
        '../Renderer/VertexLayout',
        './ColorMaterial',
        './SceneMode',
        '../Shaders/Noise',
        '../Shaders/PolygonVS',
        '../Shaders/PolygonFS',
        '../Shaders/PolygonVSPick',
        '../Shaders/PolygonFSPick'
    ], function(
        DeveloperError,
        combine,
        destroyObject,
        CesiumMath,
        Ellipsoid,
        AxisAlignedBoundingRectangle,
        Cartesian3,
        ComponentDatatype,
        MeshFilters,
        PrimitiveType,
        EllipsoidTangentPlane,
        PolygonPipeline,
        WindingOrder,
        BlendingState,
        BufferUsage,
        CullFace,
        VertexLayout,
        ColorMaterial,
        SceneMode,
        Noise,
        PolygonVS,
        PolygonFS,
        PolygonVSPick,
        PolygonFSPick) {
    "use strict";
    /*global Float32Array*/

    var attributeIndices = {
        position2D : 0,
        position3D : 1,
        textureCoordinates : 2
    };

    function PositionVertices() {
        this._va = null;
    }

    PositionVertices.prototype.getVertexArrays = function() {
        return this._va;
    };

    PositionVertices.prototype.update = function(context, positions, meshes, bufferUsage) {
        if (positions) {
            // Initially create or recreate vertex array and buffers
            this._destroyVA();

            var va = [];

            var length = meshes.length;
            for ( var i = 0; i < length; ++i) {
                va.push(context.createVertexArrayFromMesh({
                    mesh : meshes[i],
                    attributeIndices : attributeIndices,
                    bufferUsage : bufferUsage,
                    vertexLayout : VertexLayout.INTERLEAVED
                }));
            }

            this._va = va;
        } else {
            this._destroyVA();
        }
    };

    PositionVertices.prototype._destroyVA = function() {
        var va = this._va;
        if (va) {
            this._va = null;

            var length = va.length;
            for ( var i = 0; i < length; ++i) {
                va[i].destroy();
            }
        }
    };

    PositionVertices.prototype.isDestroyed = function() {
        return false;
    };

    PositionVertices.prototype.destroy = function() {
        this._destroyVA();
        return destroyObject(this);
    };

    /**
     * DOC_TBA
     *
     * @name Polygon
     * @constructor
     *
     * @example
     * var polygon = new Polygon();
     * polygon.material.color = {
     *   red   : 1.0,
     *   green : 0.0,
     *   blue  : 0.0,
     *   alpha : 1.0
     * };
     * polygon.setPositions([
     *   ellipsoid.toCartesian(new Cartographic3(...)),
     *   ellipsoid.toCartesian(new Cartographic3(...)),
     *   ellipsoid.toCartesian(new Cartographic3(...))
     * ]);
     */
    function Polygon() {
        this._sp = undefined;
        this._rs = undefined;

        this._spPick = undefined;
        this._rsPick = undefined;

        this._vertices = new PositionVertices();
        this._pickId = null;

        /**
         * DOC_TBA
         */
        this.ellipsoid = Ellipsoid.getWgs84();
        this._ellipsoid = undefined;

        /**
         * DOC_TBA
         */
        this.height = 0.0;
        this._height = undefined;

        /**
         * DOC_TBA
         */
        this.granularity = CesiumMath.toRadians(1.0);
        this._granularity = undefined;

        /**
         * DOC_TBA
         */
        this.scene2D = {
            /**
             * DOC_TBA
             */
            granularity : CesiumMath.toRadians(30.0)
        };

        /**
         * DOC_TBA
         */
        this.scene3D = {
        /**
         * DOC_TBA
         *
         * granularity can override object-level granularity
         */
        };

        this._positions = null;
        this._createVertexArray = false;

        /**
         * Determines if this polygon will be shown.
         *
         * @type Boolean
         */
        this.show = true;

        /**
         * The usage hint for the polygon's vertex buffer.
         *
         * @type BufferUsage
         *
         * @performance If <code>bufferUsage</code> changes, the next time
         * {@link Polygon#update} is called, the polygon's vertex buffer
         * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.
         * For best performance, it is important to provide the proper usage hint.  If the polygon
         * will not change over several frames, use <code>BufferUsage.STATIC_DRAW</code>.
         * If the polygon will change every frame, use <code>BufferUsage.STREAM_DRAW</code>.
         */
        this.bufferUsage = BufferUsage.STATIC_DRAW;
        this._bufferUsage = BufferUsage.STATIC_DRAW;

        /**
         * DOC_TBA
         */
        this.material = new ColorMaterial({
            color : {
                red : 1.0,
                green : 1.0,
                blue : 0.0,
                alpha : 0.5
            }
        });
        this._material = undefined;

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.erosion = 1.0;

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.morphTime = 1.0;

        this._mode = SceneMode.SCENE3D;
        this._projection = undefined;

        var that = this;
        this._uniforms = {
            u_erosion : function() {
                return that.erosion;
            },
            u_morphTime : function() {
                return that.morphTime;
            },
            u_height : function() {
                return (that._mode !== SceneMode.SCENE2D) ? that.height : 0.0;
            }
        };
        this._pickUniforms = undefined;
        this._drawUniforms = undefined;
    }

    /**
     * DOC_TBA
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#setPositions
     */
    Polygon.prototype.getPositions = function() {
        return this._positions;
    };

    /**
     * DOC_TBA
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} At least three positions are required.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#getPositions
     *
     * @example
     * polygon.setPositions([
     *   ellipsoid.toCartesian(new Cartographic3(...)),
     *   ellipsoid.toCartesian(new Cartographic3(...)),
     *   ellipsoid.toCartesian(new Cartographic3(...))
     * ]);
     */
    Polygon.prototype.setPositions = function(positions) {
        // positions can be null
        if (positions && (positions.length < 3)) {
            throw new DeveloperError("At least three positions are required.", "positions");
        }

        this._positions = positions;
        this._createVertexArray = true;
    };

    Polygon._appendTextureCoordinates = function(tangentPlane, positions2D, mesh) {
        var boundingRectangle = new AxisAlignedBoundingRectangle(positions2D);
        var origin = boundingRectangle.minimum;
        var extent = boundingRectangle.maximum.subtract(boundingRectangle.minimum);

        var positions = mesh.attributes.position.values;
        var length = positions.length;

        var textureCoordinates = new Float32Array(2 * (length / 3));
        var j = 0;

        // PERFORMANCE_IDEA:  Instead of storing texture coordinates per-vertex, we could
        // save memory by computing them in the fragment shader.  However, projecting
        // the point onto the plane may have precision issues.
        for ( var i = 0; i < length; i += 3) {
            var p = new Cartesian3(positions[i], positions[i + 1], positions[i + 2]);
            var st = tangentPlane.projectPointOntoPlane(p);
            st = st.subtract(origin);

            textureCoordinates[j++] = st.x / extent.x;
            textureCoordinates[j++] = st.y / extent.y;
        }

        mesh.attributes.textureCoordinates = {
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 2,
            values : textureCoordinates
        };

        return mesh;
    };

    Polygon.prototype._createMeshes = function() {
        // PERFORMANCE_IDEA:  Move this to a web-worker.
        var mesh;
        var meshes = null;

        if (this._positions) {
            var cleanedPositions = PolygonPipeline.cleanUp(this._positions);
            var tangentPlane = EllipsoidTangentPlane.create(this.ellipsoid, cleanedPositions);
            var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions);

            var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
            if (originalWindingOrder === WindingOrder.CLOCKWISE) {
                positions2D.reverse();
                cleanedPositions.reverse();
            }

            var indices = PolygonPipeline.earClip2D(positions2D);

            // PERFORMANCE_IDEA:  Only compute texture coordinates if the material requires them.

            if (this._mode === SceneMode.SCENE3D) {
                mesh = PolygonPipeline.computeSubdivision(cleanedPositions, indices, this._granularity);
                mesh = Polygon._appendTextureCoordinates(tangentPlane, positions2D, mesh);
                mesh = PolygonPipeline.scaleToGeodeticHeight(this.ellipsoid, mesh, this.height);
                mesh = MeshFilters.reorderForPostVertexCache(mesh);
                mesh = MeshFilters.reorderForPreVertexCache(mesh);

                mesh.attributes.position2D = { // Not actually used in shader
                    value : [0.0, 0.0]
                };
                mesh.attributes.position3D = mesh.attributes.position;
                delete mesh.attributes.position;

                meshes = MeshFilters.fitToUnsignedShortIndices(mesh);
            } else {
                mesh = PolygonPipeline.computeSubdivision(cleanedPositions, indices, this._granularity);
                mesh = Polygon._appendTextureCoordinates(tangentPlane, positions2D, mesh);
                mesh = PolygonPipeline.scaleToGeodeticHeight(this.ellipsoid, mesh, this.height);
                mesh = MeshFilters.reorderForPostVertexCache(mesh);
                mesh = MeshFilters.reorderForPreVertexCache(mesh);
                mesh = MeshFilters.projectTo2D(mesh, this._projection);
                meshes = MeshFilters.fitToUnsignedShortIndices(mesh);
            }
        }

        return meshes;
    };

    Polygon._isModeTransition = function(oldMode, newMode) {
        // SCENE2D, COLUMBUS_VIEW, and MORPHING use the same rendering path, so a
        // transition only occurs when switching from/to SCENE3D
        return ((oldMode !== newMode) &&
                ((oldMode === SceneMode.SCENE3D) ||
                 (newMode === SceneMode.SCENE3D)));
    };

    Polygon.prototype._getGranularity = function(mode) {
        if (mode === SceneMode.SCENE3D) {
            return this.scene3D.granularity || this.granularity;
        }

        return this.scene2D.granularity || this.granularity;
    };

    Polygon.prototype._syncMorphTime = function(mode) {
        switch (mode) {
        case SceneMode.SCENE3D:
            this.morphTime = 1.0;
            break;

        case SceneMode.SCENE2D:
        case SceneMode.COLUMBUS_VIEW:
            this.morphTime = 0.0;
            break;

        // MORPHING - don't change it
        }
    };

    /**
     * Commits changes to properties before rendering by updating the object's WebGL resources.
     * This must be called before calling {@link Polygon#render} in order to realize
     * changes to polygon's positions and properties.
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} this.ellipsoid must be defined.
     * @exception {DeveloperError} this.granularity must be greater than zero.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#render
     */
    Polygon.prototype.update = function(context, sceneState) {

        if (!this.ellipsoid) {
            throw new DeveloperError("this.ellipsoid must be defined.");
        }

        var mode = sceneState.mode;
        var granularity = this._getGranularity(mode);

        if (granularity < 0.0) {
            throw new DeveloperError("this.granularity and scene2D/scene3D overrides must be greater than zero.");
        }

        if (this.show) {
            this._syncMorphTime(mode);
            this._mode = mode;

            var projection = sceneState.scene2D.projection;

            if (this._createVertexArray ||
                    (this._ellipsoid !== this.ellipsoid) ||
                    (this._height !== this.height) ||
                    (this._granularity !== granularity) ||
                    (this._bufferUsage !== this.bufferUsage) ||
                    (Polygon._isModeTransition(this._mode, mode)) ||
                    (this._projection !== projection)) {
                this._createVertexArray = false;
                this._ellipsoid = this.ellipsoid;
                this._height = this.height;
                this._granularity = granularity;
                this._bufferUsage = this.bufferUsage;

                this._projection = projection;

                this._vertices.update(context, this._positions, this._createMeshes(), this.bufferUsage);
            }

            if (!this._rs) {
                // TODO: Should not need this in 2D/columbus view, but is hiding a triangulation issue.
                this._rs = context.createRenderState({
                    cull : {
                        enabled : true,
                        face : CullFace.BACK
                    },
                    blending : BlendingState.ALPHA_BLEND
                });
            }

            // Recompile shader when material changes
            if (!this._material || (this._material !== this.material)) {
                this._material = this.material || new ColorMaterial();

                var fsSource =
                    "#line 0\n" +
                    Noise +
                    "#line 0\n" +
                    this.material._getShaderSource() +
                    "#line 0\n" +
                    PolygonFS;

                this._sp = this._sp && this._sp.release();
                this._sp = context.getShaderCache().getShaderProgram(PolygonVS, fsSource, attributeIndices);

                this._drawUniforms = combine(this._uniforms, this.material._uniforms);
            }
        }
    };

    /**
     * Renders the polygon.  In order for changes to positions and properties to be realized,
     * {@link Polygon#update} must be called before <code>render</code>.
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#update
     * @see Polygon#setTextureAtlas
     */
    Polygon.prototype.render = function(context) {
        if (this.show) {
            var vas = this._vertices.getVertexArrays();
            var length = vas.length;
            for ( var j = 0; j < length; ++j) {
                context.draw({
                    primitiveType : PrimitiveType.TRIANGLES,
                    shaderProgram : this._sp,
                    uniformMap : this._drawUniforms,
                    vertexArray : vas[j],
                    renderState : this._rs
                });
            }
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    Polygon.prototype.updateForPick = function(context) {
        if (this.show) {
            this._spPick = context.getShaderCache().getShaderProgram(PolygonVSPick, PolygonFSPick, attributeIndices);

            this._rsPick = context.createRenderState({
                // TODO: Should not need this in 2D/columbus view, but is hiding a triangulation issue.
                cull : {
                    enabled : true,
                    face : CullFace.BACK
                }
            });

            this._pickId = context.createPickId(this);

            var that = this;
            this._pickUniforms = {
                u_pickColor : function() {
                    return that._pickId.normalizedRgba;
                },
                u_morphTime : function() {
                    return that.morphTime;
                },
                u_height : function() {
                    return that.height;
                }
            };

            this.updateForPick = function(context) {
            };
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Polygon
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    Polygon.prototype.renderForPick = function(context, framebuffer) {
        if (this.show) {
            var vas = this._vertices.getVertexArrays();
            var length = vas.length;
            for ( var j = 0; j < length; ++j) {
                context.draw({
                    primitiveType : PrimitiveType.TRIANGLES,
                    shaderProgram : this._spPick,
                    uniformMap : this._pickUniforms,
                    vertexArray : vas[j],
                    renderState : this._rsPick,
                    framebuffer : framebuffer
                });
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Polygon
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Polygon#destroy
     */
    Polygon.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Polygon
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polygon#isDestroyed
     *
     * @example
     * polygon = polygon && polygon.destroy();
     */
    Polygon.prototype.destroy = function() {
        this._sp = this._sp && this._sp.release();
        this._spPick = this._spPick && this._spPick.release();
        this._vertices = this._vertices.destroy();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return Polygon;
});