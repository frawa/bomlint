import {IPackageJson} from "package-json-type";

export type StringDict = { [key: string]: string };

export interface CheckResult {
    readonly patchedPackageJson?: IPackageJson;
    readonly updates: readonly string[];
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