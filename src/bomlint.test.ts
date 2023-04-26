import {checkForUpdatesFromBom, CheckResult, StringDict} from "./bomlint";
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


describe('bomlint', function () {
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
});
