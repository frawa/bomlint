import {
    checkForConflictingDeps,
    checkForUpdatesFromBom, collectDependencies, Conflict,
    mergeIntoBom,
    PackageToCheck,
    StringDict
} from "./bomlint";
import {IPackageJson} from "package-json-type";

function expectSuccess(bom: StringDict, packageJson: IPackageJson) {
    const r = checkForUpdatesFromBom(bom, packageJson)
    expect(r.updates.length).toBe(0);
    expect(r.patchedPackageJson).toEqual(packageJson);
}

const packageJson: IPackageJson = {
    dependencies: {
        "foo": "X",
        "bar": "Y",
        "baz": "Z"
    }
};

const packageJsonMixed: IPackageJson = {
    dependencies: {
        "foo": "X"
    },
    devDependencies: {
        "bar": "Y"
    },
    peerDependencies: {
        "baz": "Z"
    }
};


describe('bomlint check', function () {
    test('empty bom empty deps', function () {
        expectSuccess(
            {},
            {},
        )
    });
    test('empty deps', function () {
        expectSuccess(
            {
                "foo": "X",
                "bar": "Y"
            },
            {}
        );
    });
    test('empty bom', function () {
        expectSuccess(
            {},
            packageJson,
        )
    });
    test('empty bom mixed', function () {
        expectSuccess(
            {},
            packageJsonMixed,
        )
    });
    test('one dep', function () {
        expectSuccess(
            {
                "foo": "X"
            },
            packageJson
        );
    });
    test('one dep mixed', function () {
        expectSuccess(
            {
                "foo": "X"
            },
            packageJsonMixed
        );
    });
    test('two deps', function () {
        expectSuccess(
            {
                "foo": "X",
                "bar": "Y"
            },
            packageJson
        );
    });
    test('two deps mixed', function () {
        expectSuccess(
            {
                "foo": "X",
                "bar": "Y"
            },
            packageJsonMixed
        );
    });
    test('failing dep', function () {
        const r = checkForUpdatesFromBom({
            "foo": "X2"
        }, packageJson)
        expect(r.updates.length).toBe(1);
        expect(r.updates[0]).toBe("foo");
        expect(r.patchedPackageJson?.dependencies?.foo).toEqual("X2");
        expect(r.patchedPackageJson?.dependencies?.bar).toEqual("Y");
        expect(r.patchedPackageJson?.dependencies?.baz).toEqual("Z");
    });
    test('failing devDep', function () {
        const r = checkForUpdatesFromBom({
            "bar": "Y2"
        }, packageJsonMixed)
        expect(r.updates.length).toBe(1);
        expect(r.updates[0]).toBe("bar (dev)");
        expect(r.patchedPackageJson?.dependencies?.foo).toEqual("X");
        expect(r.patchedPackageJson?.devDependencies?.bar).toEqual("Y2");
        expect(r.patchedPackageJson?.peerDependencies?.baz).toEqual("Z");
    });
    test('failing dups in same package', function() {
        const r = checkForUpdatesFromBom(
            {},
            {
                dependencies: {
                    "foo": "X"
                },
                devDependencies: {
                    "foo": "Y"
                }
            }
        );
    })
});

describe('bomlint merge', function () {
    test('empty merge', function() {
        const r = mergeIntoBom(
            {},
            {}
        );
        expect(r.patchedBom).toEqual({});
    });
    test('not in BOM', function() {
        const r = mergeIntoBom(
            {
                dependencies: {
                    "foo": "X"
                }
            },
            {}
        );
        expect(r.patchedBom).toEqual({
            "foo": "X"
        });
    })
    test('merge', function() {
        const r = mergeIntoBom(
            {
                dependencies: {
                    "foo": "Y"
                }
            },
            {
                "foo": "X"
            }
        );
        expect(r.patchedBom).toEqual({
            "foo": "X || Y"
        });
    });

});

describe('conflicting deps', function() {
    test('no conflicts', function() {
       const r = checkForConflictingDeps([
            { path: "p1", packageJson: { dependencies: { "foo": "X" }}},
            { path: "p2", packageJson: { dependencies: { "foo": "X" }}},
       ]);
       expect(r).toEqual([]);
    });
    test('conflict in single package', function() {
        const p: PackageToCheck = {
            path: "p1",
            packageJson: {
                dependencies: {
                    "foo": "X"
                },
                devDependencies: {
                    "foo": "Y"
                }
            }
        };
        const r = checkForConflictingDeps([p]);
        const e: Conflict[] = [
            {
                dependency: "foo",
                conflicts: [
                    {
                        pkg: p,
                        version: "X"
                    },
                    {
                        pkg: p,
                        version: "Y"
                    }
                ]
            }
        ];
        expect(r).toEqual(e);
    });
    test('conflict in different packages', function() {
        const p1: PackageToCheck = {
            path: "p1",
            packageJson: {
                dependencies: {
                    "foo": "X"
                }
            }
        };
        const p2: PackageToCheck = {
            path: "p2",
            packageJson: {
                devDependencies: {
                    "foo": "Y"
                }
            }
        };
        const r = checkForConflictingDeps([ p1, p2 ]);
        const e: Conflict[] = [
            {
                dependency: "foo",
                conflicts: [
                    {
                        pkg: p1,
                        version: "X"
                    },
                    {
                        pkg: p2,
                        version: "Y"
                    }
                ]
            }
        ];
        expect(r).toEqual(e);
    });
    test('allow conflicts', function() {
        const p1: PackageToCheck = {
            path: "p1",
            packageJson: {
                dependencies: {
                    "foo": "X",
                    "bar": "Z"
                }
            }
        };
        const p2: PackageToCheck = {
            path: "p2",
            packageJson: {
                devDependencies: {
                    "foo": "Y",
                    "bar": "Z"
                }
            }
        };
        const allowConflicts = new Set(["foo"]);
        const r = checkForConflictingDeps([ p1, p2 ], allowConflicts);
        expect(r).toEqual([]);
    });
    test('allow conflicts 2', function() {
        const p1: PackageToCheck = {
            path: "p1",
            packageJson: {
                dependencies: {
                    "foo": "X",
                    "bar": "Z1"
                }
            }
        };
        const p2: PackageToCheck = {
            path: "p2",
            packageJson: {
                devDependencies: {
                    "foo": "Y",
                    "bar": "Z2"
                }
            }
        };
        const allowConflicts = new Set(["foo"]);
        const r = checkForConflictingDeps([ p1, p2 ], allowConflicts);
        const e: Conflict[] = [
            {
                dependency: "bar",
                conflicts: [
                    {
                        pkg: p1,
                        version: "Z1"
                    },
                    {
                        pkg: p2,
                        version: "Z2"
                    }
                ]
            }
        ];
        expect(r).toEqual(e);
    });
});

describe('collect deps', function () {
    test('no deps', function() {
        const r = collectDependencies([])
        expect(r).toEqual(new Map());
    });
    test('one package', function() {
        const r = collectDependencies([
            {
                path: 'p1',
                packageJson: {
                    dependencies: {
                        "foo": "X"
                    },
                    devDependencies: {
                        "bar": "Y"
                    },
                    peerDependencies: {
                        "baz": "Z"
                    }
                }
            }
        ]);
        expect(r.has("foo")).toBe(true);
        expect(r.get("foo")?.get("X")).toEqual(new Set(["p1"]))
        expect(r.has("bar")).toBe(true);
        expect(r.get("bar")?.get("Y")).toEqual(new Set(["p1"]))
        expect(r.has("baz")).toBe(true);
        expect(r.get("baz")?.get("Z")).toEqual(new Set(["p1"]))
    })
});
