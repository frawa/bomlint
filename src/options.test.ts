import { parseOptions } from "./options";

describe('options', function () {

    const nodeArgs = (args: string[]) => ['node', 'script', ...args]

    describe('check command', () => {
        it("nothing", () => {
            const command = parseOptions(nodeArgs([]))
            expect(command).toEqual(({ command: 'check', files: [] }))
        });
        it("help", () => {
            const command = parseOptions(nodeArgs(['--help']))
            expect(command).toMatch(/^Usage: bomlint/)
        });
        it("unkown", () => {
            const command = parseOptions(nodeArgs(['--boom']))
            expect(command).toMatch(/^Usage: bomlint/)
        });
        it("just a file", () => {
            const command = parseOptions(nodeArgs(['file.txt']))
            expect(command).toEqual({ command: 'check', files: ['file.txt'] })
        });
        it("check two files", () => {
            const command = parseOptions(nodeArgs(['file.txt', 'file2.txt']))
            expect(command).toEqual({ command: 'check', files: ['file.txt', 'file2.txt'] })
        });
    });

    describe('fix command', () => {
        it("nothing", () => {
            const command = parseOptions(nodeArgs(['--fix']))
            expect(command).toEqual(({ command: 'fix', files: [] }))
        });
        it("just a file", () => {
            const command = parseOptions(nodeArgs(['--fix', 'file.txt']))
            expect(command).toEqual({ command: 'fix', files: ['file.txt'] })
        });
        it("check two files", () => {
            const command = parseOptions(nodeArgs(['--fix', 'file.txt', 'file2.txt']))
            expect(command).toEqual({ command: 'fix', files: ['file.txt', 'file2.txt'] })
        });
    });

    describe('merge command', () => {
        it("nothing", () => {
            const command = parseOptions(nodeArgs(['--merge']))
            expect(command).toEqual(({ command: 'merge', files: [] }))
        });
        it("just a file", () => {
            const command = parseOptions(nodeArgs(['--merge', '--bom', 'bom.file', 'file.txt']))
            expect(command).toEqual({ command: 'merge', bom: 'bom.file', files: ['file.txt'] })
        });
        it("check two files", () => {
            const command = parseOptions(nodeArgs(['--merge', '--bom', 'bom.file', 'file.txt', 'file2.txt']))
            expect(command).toEqual({ command: 'merge', bom: 'bom.file', files: ['file.txt', 'file2.txt'] })
        });
    });

    describe('prune command', () => {
        it("nothing", () => {
            const command = parseOptions(nodeArgs(['--prune']))
            expect(command).toEqual(({ command: 'prune', files: [] }))
        });
        it("just a file", () => {
            const command = parseOptions(nodeArgs(['--prune', '--bom', 'bom.file', 'file.txt']))
            expect(command).toEqual({ command: 'prune', bom: 'bom.file', files: ['file.txt'] })
        });
        it("check two files", () => {
            const command = parseOptions(nodeArgs(['--prune', '--bom', 'bom.file', 'file.txt', 'file2.txt']))
            expect(command).toEqual({ command: 'prune', bom: 'bom.file', files: ['file.txt', 'file2.txt'] })
        });
    });

});