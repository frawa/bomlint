import {IPackageJson} from "package-json-type";
import fs from "fs";
import path from "path";

export type StringDict = { [key: string]: string };

export interface CheckResult {
    readonly patchedPackageJson?: IPackageJson;
    readonly updates: readonly string[];
}
//
// export function checkForDuplicates(packageJson: IPackageJson): StringDict {
//     let d =
// }

export function checkForUpdatesFromBom(bom: StringDict, packageJson: IPackageJson): CheckResult {

    const updates: string[] = []
    let patchedPackageJson: IPackageJson = packageJson;
    for (let [pkg, version] of Object.entries(bom)) {
        if (packageJson.dependencies !== undefined && hasDifferentVersion(packageJson.dependencies, pkg, version)) {
            patchedPackageJson = {
                ...patchedPackageJson,
                dependencies: {
                    ...patchedPackageJson.dependencies,
                }
            }
            if (patchedPackageJson.dependencies) {
                patchedPackageJson.dependencies[pkg] = version;
            }

            updates.push(pkg)
        }
        if (packageJson.peerDependencies !== undefined && hasDifferentVersion(packageJson.peerDependencies, pkg, version)) {
            patchedPackageJson = {
                ...patchedPackageJson,
                peerDependencies: {
                    ...patchedPackageJson.peerDependencies,
                }
            }
            if (patchedPackageJson.peerDependencies) {
                patchedPackageJson.peerDependencies[pkg] = version;
            }
            updates.push(pkg + " (peer)");
        }
        if (packageJson.devDependencies !== undefined && hasDifferentVersion(packageJson.devDependencies, pkg, version)) {
            patchedPackageJson = {
                ...patchedPackageJson,
                devDependencies: {
                    ...patchedPackageJson.devDependencies,
                }
            }
            if (patchedPackageJson.devDependencies) {
                patchedPackageJson.devDependencies[pkg] = version;
            }
            updates.push(pkg + " (dev)");
        }
        const packageVersion = packageJson.version
        if (pkg === packageJson.name && packageVersion !== version) {
            patchedPackageJson = {
                ...patchedPackageJson,
                version
            }
            updates.push(pkg + " (self)");
        }
    }

    return {
        patchedPackageJson,
        updates
    }
}

function hasDifferentVersion(deps: any, pkg: string, version: string) {
    return deps && deps[pkg] && deps[pkg] !== version
}

export interface MergeResult {
    readonly patchedBom: StringDict;
    readonly count: number;
}

export function mergeIntoBom(packageJson: IPackageJson, bom: StringDict): MergeResult {
    const all: StringDict = {
        ...packageJson.dependencies,
        ...packageJson.peerDependencies,
        ...packageJson.devDependencies,
    }

    const patchedBom: StringDict = Object.assign({}, bom);
    let count = 0
    for (let [pkg, version] of Object.entries(all)) {
        const bomVersion = patchedBom[pkg]
        if (bomVersion && bomVersion !== version) {
            patchedBom[pkg] = `${bomVersion} || ${version}`
            count++
        } else {
            patchedBom[pkg] = version
        }
    }

    return {
        patchedBom,
        count
    }
}

const homePath = require('os').homedir();

export function findBomPath(dir: string): string {
    const candidate = path.join(dir, ".bomlint.json")
    if (fs.existsSync(candidate)) {
        return candidate
    }
    if (dir === homePath) {
        return ".bomlint.json"
    }
    return findBomPath(path.dirname(dir))
}