defineSuite([
         'Core/Cache',
         'Core/Cartesian3'
     ], function(
         Cache,
         Cartesian3) {
    "use strict";
    /*global it,expect,beforeEach*/

    var AddAlways = function(fetchFunc) {
        this._fetchFunc = fetchFunc;
    };

    AddAlways.prototype.hit = function(object) {
        if (!object.timesHit) {
            object.timesHit = 0;
        }
        ++object.timesHit;
        return object;
    };

    AddAlways.prototype.miss = function(name, key, object) {
        var fetched = this._fetchFunc(key);
        object[name] = fetched;
        return fetched;
    };

    var cache;

    beforeEach(function() {
        var fetch = function(numberObject) {
            // calculates nth fibonacci number
            var n = numberObject.n;
            var x = 0;
            var y = 1;
            for ( var i = 2; i <= n; ++i) {
                var temp = x + y;
                x = y;
                y = temp;
            }
            return {
                fibonacciNumber : y
            };
        };
        cache = new Cache(new AddAlways(fetch));
    });

    it("constructor throws with no policy", function() {
        expect(function() {
            return new Cache();
        }).toThrow();
    });

    it("constructor throws when policy has no hit function", function() {
        expect(function() {
            return new Cache({
                miss : function() {
                    return "nonsense";
                }
            });
        }).toThrow();
    });

    it("constructor throws when policy has no miss function", function() {
        expect(function() {
            return new Cache({
                hit : function() {
                    return "nonsense";
                }
            });
        }).toThrow();
    });

    it("find throws with no key", function() {
        expect(function() {
            cache.find();
        }).toThrow();

        expect(function() {
            cache.find({
                nonsense : "nonsense"
            });
        }).toThrow();
    });

    it("find", function() {
        var tenth = {
            n : 10,
            key : "10"
        };
        var fn = cache.find(tenth);
        expect(fn.fibonacciNumber).toEqual(55);

        var eleventh = {
            n : 11,
            key : "11"
        };
        var fn2 = cache.find(eleventh);
        expect(fn2.fibonacciNumber).toEqual(89);

        var timesHit = 5;
        for ( var i = 0; i < timesHit; ++i) {
            cache.find(eleventh);
        }
        expect(fn2.timesHit).toEqual(timesHit);
    });

    it("remove", function() {
        var thirteenth = {
            n : 13,
            key : "13"
        };
        expect(cache.remove(thirteenth)).toBeFalsy();

        expect(cache.find(thirteenth).fibonacciNumber).toEqual(233);
        expect(cache.find(thirteenth).timesHit).toEqual(1);
        expect(cache.remove(thirteenth)).toBeTruthy();
        expect(cache.find(thirteenth).timesHit).toBeFalsy();
        expect(cache.remove({
            n : 14,
            key : "14"
        })).toBeFalsy();
    });

    it("remove returns false with no key", function() {
        var result = cache.remove();
        expect(result).toBeFalsy();
     });

    it("destroy", function() {
        cache = cache && cache.destroy();
        expect(cache).toBeUndefined();
    });

    it("isDestroyed returns false", function() {
       expect(cache.isDestroyed()).toBeFalsy();
    });
});
