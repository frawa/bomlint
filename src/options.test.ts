import { Command, parseOptions, parseOptionsWithOutput } from "./options";

describe('options', function () {

    const nodeArgs = (args: string[]) => ['node', 'script', ...args]

    describe('help', () => {
        it("global help", () => {
            const [command,output] = parseOptionsWithOutput(nodeArgs(['--help']))
            expect(output).toMatch(/^Usage: bomlint/)
        });
        it("global help command", () => {
            const [command,output] = parseOptionsWithOutput(nodeArgs(['help']))
            expect(output).toMatch(/^Usage: bomlint/)
        });
        it("check help", () => {
            const [command,output] = parseOptionsWithOutput(nodeArgs(['help', 'check']))
            expect(output).toMatch(/^Usage: bomlint check/)
        });
        it("unkown", () => {
            const [command,output] = parseOptionsWithOutput(nodeArgs(['--boom']))
            expect(output).toMatch(/^error: unknown option '--boom'/)
            expect(output).toMatch(/Usage: bomlint/)
        });
        it("nothing", () => {
            const [command,output] = parseOptionsWithOutput(nodeArgs([]))
            expect(output).toMatch(/^Usage: bomlint/)
        });
    });

    describe('check command', () => {
        it("no file", () => {
            const command = parseOptions(nodeArgs(['check']))
            expect(command).toEqual<Command>({ command: 'check', files: [] })
        });
        it("just a file", () => {
            const command = parseOptions(nodeArgs(['check', 'file.txt']))
            expect(command).toEqual({ command: 'check', files: ['file.txt'] })
        });
        it("two files", () => {
            const command = parseOptions(nodeArgs(['check', 'file.txt', 'file2.txt']))
            expect(command).toEqual({ command: 'check', files: ['file.txt', 'file2.txt'] })
        });
        it("with bom file", () => {
            const command = parseOptions(nodeArgs(['check', '--bom', 'bomfile', 'file.txt', 'file2.txt']))
            expect(command).toEqual({ command: 'check', bom: 'bomfile', files: ['file.txt', 'file2.txt'] })
        });
        it("allow conflicts", () => {
            const command = parseOptions(nodeArgs(['check', '--allow-conflicts', 'allow1,allow2', 'file.txt']))
            expect(command).toEqual<Command>({
                command: 'check',
                allowConflicts: ['allow1', 'allow2'], 
                files: ['file.txt']
            })
        });
    });

    describe('fix command', () => {
        it("nothing", () => {
            const command = parseOptions(nodeArgs(['fix']))
            expect(command).toEqual(({ command: 'fix', files: [] }))
        });
        it("just a file", () => {
            const command = parseOptions(nodeArgs(['fix', 'file.txt']))
            expect(command).toEqual({ command: 'fix', files: ['file.txt'] })
        });
        it("allow conflicts", () => {
            const command = parseOptions(nodeArgs(['fix', '--allow-conflicts', 'allow1,allow2', 'file.txt']))
            expect(command).toEqual({
                command: 'fix',
                allowConflicts: ['allow1', 'allow2'], 
                files: ['file.txt']
            })
        });
    });

    describe('merge command', () => {
        it("nothing", () => {
            const command = parseOptions(nodeArgs(['merge']))
            expect(command).toEqual(({ command: 'merge', files: [] }))
        });
        it("just a file", () => {
            const command = parseOptions(nodeArgs(['merge', '--bom', 'bom.file', 'file.txt']))
            expect(command).toEqual({ command: 'merge', bom: 'bom.file', files: ['file.txt'] })
        });
        it("check two files", () => {
            const command = parseOptions(nodeArgs(['merge', '--bom', 'bom.file', 'file.txt', 'file2.txt']))
            expect(command).toEqual({ command: 'merge', bom: 'bom.file', files: ['file.txt', 'file2.txt'] })
        });
        it("allow conflicts", () => {
            const command = parseOptions(nodeArgs(['merge', '--allow-conflicts', 'allow1,allow2', 'file.txt']))
            expect(command).toEqual({
                command: 'merge',
                allowConflicts: ['allow1', 'allow2'], 
                files: ['file.txt']
            })
        });
    });

    describe('prune command', () => {
        it("nothing", () => {
            const command = parseOptions(nodeArgs(['prune']))
            expect(command).toEqual(({ command: 'prune', files: [] }))
        });
        it("just a file", () => {
            const command = parseOptions(nodeArgs(['prune', '--bom', 'bom.file', 'file.txt']))
            expect(command).toEqual({ command: 'prune', bom: 'bom.file', files: ['file.txt'] })
        });
        it("check two files", () => {
            const command = parseOptions(nodeArgs(['prune', '--bom', 'bom.file', 'file.txt', 'file2.txt']))
            expect(command).toEqual({ command: 'prune', bom: 'bom.file', files: ['file.txt', 'file2.txt'] })
        });
    });

});