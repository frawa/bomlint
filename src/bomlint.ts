import { IDependencyMap, IPackageJson } from "package-json-type";
import fs from "fs";
import path from "path";

export type StringDict = { [key: string]: string };

export interface CheckResult {
    readonly patchedPackageJson?: IPackageJson;
    readonly updates: readonly string[];
}

export interface PackageToCheck {
    readonly path: string;
    readonly packageJson: IPackageJson;
}

export interface DependencyConflict {
    readonly pkg: PackageToCheck;
    readonly version: string;
}

export interface Conflict {
    readonly dependency: string;
    readonly conflicts: readonly DependencyConflict[];
}

function reduceDeps(pkg: PackageToCheck, dependencies: IDependencyMap | undefined, acc: Map<string, Map<string, Set<string>>>, allowConflicts: Set<string>) {
    if (dependencies) {
        for (let [depName, version] of Object.entries(dependencies)) {
            if (!allowConflicts.has(depName)) {
                let depItem = acc.get(depName);
                if (!depItem) {
                    depItem = new Map<string, Set<string>>();
                    acc.set(depName, depItem);
                }
                let versionItem = depItem.get(version);
                if (!versionItem) {
                    versionItem = new Set<string>();
                    depItem.set(version, versionItem);
                }
                versionItem.add(pkg.path);
            }
        }
    }
}

export function checkForConflictingDeps(packages: readonly PackageToCheck[], allowConflicts: Set<string> = new Set()): Conflict[] {

    const findPkgByPath = (path: string) => packages.find(p => p.path === path);

    // create index of dependencies
    // dep -> version -> paths
    const depIndex = packages.reduce((acc, pkg) => {
        reduceDeps(pkg, pkg.packageJson.dependencies, acc, allowConflicts);
        reduceDeps(pkg, pkg.packageJson.devDependencies, acc, allowConflicts);
        reduceDeps(pkg, pkg.packageJson.peerDependencies, acc, allowConflicts);
        return acc;
    }, new Map<string, Map<string, Set<string>>>());

    // now look for conflicts
    const items: Conflict[] = [];

    for (let [dependency, versions] of depIndex) {
        if (versions.size > 1) {
            const conflicts: DependencyConflict[] = [];
            for (let [version, pkgPaths] of versions) {
                for (let pkgPath of pkgPaths) {
                    const pkg = findPkgByPath(pkgPath);
                    if (pkg) {
                        const dc: DependencyConflict = {
                            pkg,
                            version
                        }
                        conflicts.push(dc);
                    }
                }
            }
            const c: Conflict = {
                conflicts,
                dependency
            }
            items.push(c);
        }
    }

    return items;
}

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

export interface PruneResult {
    readonly patchedBom: StringDict;
    readonly count: number;
}

export function pruneFromBom(bom: StringDict, packageJsons: readonly IPackageJson[]): PruneResult {
    if (packageJsons.length <= 1) {
        return { patchedBom: {...bom}, count: 0 };
    }

    const packageSets = packageJsons.map(p => new Set(Object.keys({ ...p.dependencies, ...p.devDependencies, ...p.peerDependencies })))
    const counts = new Map(Object.keys(bom).map(pkg => [pkg,packageSets.filter(set => set.has(pkg)).length]))

    const patchedBom: StringDict = Object.fromEntries(Object.entries(bom).filter(([pkg, _]) => (counts.get(pkg) ?? 0) > 1))
    const count = Object.keys(bom).length - Object.keys(patchedBom).length

    return { patchedBom, count };
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