#!/usr/bin/env node

// Align versions in a package.json file with versions in a .bomlint.json file.

if (process.argv.includes("--help")) {
    console.log("bomlint [[--fix] | [--merge] | [--help]] [<path to package.json>])")
    console.log("\t        \tCheck this package dependencies against BOM file.")
    console.log("\t--help  \tThis message.")
    console.log("\t--fix   \tApply BOM file to this package dependencies.")
    console.log("\t--merge \tAdd this package dependencies to BOM file.")
    process.exit(0)
}

const merge = process.argv.includes("--merge")
const fix = process.argv.includes("--fix")

const pathArg = process.argv.find((arg, i) => i > 1 && !arg.startsWith('--')) || "package.json"

const fs = require('fs')
const path = require('path');
const cwd = process.cwd()

const packageJsonPath = path.relative(cwd, pathArg)

if (!fs.existsSync(packageJsonPath)) {
    console.log(`No package file ${packageJsonPath}.`)
    process.exit(1)
}


const homePath = require('os').homedir();
const bomPath = path.relative(cwd, findBomPath(cwd))

if (!fs.existsSync(bomPath)) {
    console.log(`No BOM file ${bomPath}.`)
    process.exit(1)
}

const bom = JSON.parse(fs.readFileSync(bomPath))
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath))

if (merge) {
    mergeIntoBom(packageJson, bom)
    process.exit(1)
}

const success = checkForUpdatesFromBom(bom, packageJson, fix)
process.exit(success ? 0 : 1)

// ---

function findBomPath(dir) {
    const candidate = path.join(dir, ".bomlint.json")
    if (fs.existsSync(candidate)) {
        return candidate
    }
    if (dir === homePath) {
        return ".bomlint.json"
    }
    return findBomPath(path.dirname(dir))
}

function checkForUpdatesFromBom(bom, packageJson, fix) {
    console.log(`Linting ${packageJsonPath} using BOM ${bomPath}.`)

    let updates = []
    for (let [package, version] of Object.entries(bom)) {
        if (hasDifferentVersion(packageJson.dependencies, package, version)) {
            packageJson.dependencies[package] = version
            updates.push(package)
        }
        if (hasDifferentVersion(packageJson.peerDependencies, package, version)) {
            packageJson.peerDependencies[package] = version
            updates.push(package + " (peer)");
        }
        if (hasDifferentVersion(packageJson.devDependencies, package, version)) {
            packageJson.devDependencies[package] = version
            updates.push(package + " (dev)");
        }
        const packageVersion = packageJson.version
        if (package === packageJson.name && packageVersion !== version) {
            packageJson[version] = version;
            updates.push(package + " (self)");
        }
    }

    if (updates.length > 0) {
        if (fix) {
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
            console.log(`Updates written to ${packageJsonPath}.`, updates)
            return true
        } else {
            console.log(`Updates needed in ${packageJsonPath}.`, updates)
            return false
        }
    }
    return true
}

function hasDifferentVersion(deps, package, version) {
    return deps && deps[package] && deps[package] !== version
}

function mergeIntoBom(packageJson, bom) {
    console.log(`Merging ${packageJsonPath} into BOM ${bomPath}.`)

    const all = {
        ...packageJson.dependencies,
        ...packageJson.peerDependencies,
        ...packageJson.devDependencies,
    }

    const merged = Object.assign({}, bom);
    let count = 0
    for (let [package, version] of Object.entries(all)) {
        const bomVersion = merged[package]
        if (bomVersion && bomVersion !== version) {
            merged[package] = `${bomVersion} || ${version}`
            count++
        } else {
            merged[package] = version
        }
    }

    if (count > 0) {
        fs.writeFileSync(bomPath, JSON.stringify(merged, null, 2))
        console.log(`Merges written to BOM ${bomPath}.`)
    } else {
        console.log(`No merges needed.`)
    }
}
