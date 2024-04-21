/**
 * The MIT License (MIT)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * @license MIT
 * @author Falcion
 * @year 2023-2024
 */

import * as path from 'path';
import * as fsxt from 'fs-extra';
import * as dotenv from 'dotenv';

import colors from 'colors/safe';

import readline from 'readline';

/**
 * Class representing a module for preparing and managing project files.
 * This module includes functionality for searching directories, updating manifests, and more.
 * @class
 */
class PREPARE_MODULE {
    /**
     * The root directory of the project.
     * @type {string}
     */
    public ROOT_DIRECTORY: string = __dirname;

    /**
     * Array of folder names to exclude from directory traversal.
     * @type {string[]}
     */
    private EXCLUDING_FOLDER: string[] = [
        'node_modules',
        'venv',
        '.git',
        'out'
    ];
    /**
     * Array of values to include into file content search.
     * @type {string[]}
     */
    private EXCLUDING_VALUES: string[] = [
        'FALCION',
        'PATTERNU',
        'PATTERNUGIT'
    ];

    /**
     * Flag indicating whether to update the manifesto file.
     * @type {boolean}
     */
    public UPDATE_MANIFESTO?: boolean = false;

    /**
     * Creates an instance of the `PREPARE_MODULE` class.
     * @constructor
     * @param {string[]} entries - Custom signatures (words) for file content search.
     * @param {string} extraction_mode - Extraction mode: 'Y' for appending, 'N' for replacing, 'C' for custom.
     */
    constructor(entries: string[], extraction_mode: string = 'C') {
        if (extraction_mode == 'Y') {
            for (const item of entries)
                this.EXCLUDING_VALUES.push(item);
        }
        if (extraction_mode == 'N') {
            this.EXCLUDING_VALUES = this.EXCLUDING_VALUES;
        }
        if (extraction_mode == 'C') {
            this.EXCLUDING_VALUES = entries;
        }
    }

    /**
     * Asynchronously searches for custom signatures (words) in the content of a file.
     * @param {string} filepath - The path of the file to search.
     * @param {string[]} data - Custom signatures (words) to search for.
     * @returns {Promise<void>}
     */
    async __searchDir(filepath: string, data: string[]): Promise<void> {
        const filedata: string = await fsxt.readFile(filepath, 'utf-8');
        const contents: string[] = filedata.split('\n');

        for (let i = 0; i < contents.length; i++) {
            const line = contents[i].toUpperCase();

            for (const target of data)
                if (line.includes(target))
                    console.info(colors.green(`Found "${target}" in L#${i} of:\n` + colors.cyan(filepath)))
        }
    }

    /**
     * Asynchronously traverses a directory, searching for files and directories.
     * @param {string} directory - The directory to traverse.
     * @returns {Promise<void>}
     */
    async __traverDir(directory: string): Promise<void> {
        try {
            const files: string[] = await fsxt.readdir(directory);

            for (const file of files) {
                const filepath = path.join(directory, file);

                const filestat = await fsxt.stat(filepath);

                if (filestat.isDirectory()) {
                    if (!this.EXCLUDING_FOLDER.includes(file)) {
                        await this.__traverDir(filepath);
                    }
                } else if (filestat.isFile()) {
                    await this.__searchDir(filepath, this.EXCLUDING_VALUES);
                }
                else
                    continue;
            }
        }
        catch (err) {
            console.error(colors.red('Error via reading given directory: ' + `${err}`));
        }
    }

    /**
     * Asynchronously prepares project files, such as .env and manifest.json.
     * @returns {Promise<void>}
     */
    async __prpPrjct(): Promise<void> {
        const input1: string =
            [
                '# Type here any requested keys, token or other, for example, API or connection data',
                'EXAMPLE_API_KEY='
            ]
                .join('\n');

        const input2: string = JSON.stringify({}, undefined, 2);

        if (await fsxt.exists(path.join(__dirname, '.env'))) {
            await fsxt.ensureFile(path.join(__dirname, '.env'));
            await fsxt.writeFile(path.join(__dirname, '.env'),
                input1);
        }

        if (await fsxt.exists(path.join(__dirname, 'manifest.json'))) {
            await fsxt.ensureFile(path.join(__dirname, 'manifest.json'));
            await fsxt.writeFile(path.join(__dirname, 'manifest.json'),
                input2);
        }

        if (this.UPDATE_MANIFESTO == undefined || this.UPDATE_MANIFESTO == false) {
            return;
        }

        const PACKAGER: any = JSON.parse(await fsxt.readFile('package.json', { encoding: 'utf-8' }));
        const MANIFEST: any = JSON.parse(await fsxt.readFile('manifest.json', { encoding: 'utf-8' }));

        if (PACKAGER.name === MANIFEST.id &&
            PACKAGER.displayName === MANIFEST.name &&
            PACKAGER.description === MANIFEST.description &&
            PACKAGER.author.name === MANIFEST.author &&
            PACKAGER.author.url === MANIFEST.authorUrl &&
            PACKAGER.license === MANIFEST.license &&
            PACKAGER.version === MANIFEST.version) {
            console.warn(colors.bgGreen(colors.white('Manifest is synced with package, keep everything as it was.')));
        }
        else {
            console.warn(colors.bgBlue(colors.yellow('Manifest is not synced with package\'s information, rewriting it.')));

            await fsxt.copyFile(
                'manifest.json',
                'manifest-backup.json');

            const data: any = {
                'id':
                    PACKAGER.name,
                'name':
                    PACKAGER.displayName,
                'description':
                    PACKAGER.description,
                'author':
                    PACKAGER.author.name,
                'authorUrl':
                    PACKAGER.author.url,
                'license':
                    PACKAGER.license,
                'version':
                    PACKAGER.version,
            };

            await fsxt.writeFile('manifest.json', JSON.stringify(data, undefined, 2));
        }
    }
}

dotenv.config({
    path: '.env',
    encoding: 'utf-8'
});

const RL = readline.createInterface({ input: process.stdin, output: process.stdout });

RL.question(colors.bold('Change signatures of manifesto (JSON) for the repository [Y/N]: '), (input) => {
    if (input.toUpperCase() == 'Y') {
        new PREPARE_MODULE([], 'C').__prpPrjct();

        RL.close();
    } else if (input.toUpperCase() == 'N') {
        RL.close();
    }
})

RL.question(colors.bold('Change finding signatures (words) for the finder script [Y/N/C]: '), (answer) => {
    if (answer.toUpperCase() == 'Y') {
        RL.question(colors.bold('Enter your custom signatures (words) separatedly by commas: '), (addition) => {
            const input: string[] = addition.split(',');

            new PREPARE_MODULE(input, 'Y').__traverDir(__dirname);

            RL.close();
        });
    } else if (answer.toUpperCase() == 'C') {
        RL.question(colors.bold('Enter your custom signatures (words) separatedly by commas: '), (addition) => {
            const input: string[] = addition.split(',');

            new PREPARE_MODULE(input, 'C').__traverDir(__dirname);

            RL.close();
        });
    } else if (answer.toUpperCase() == 'N') {
        new PREPARE_MODULE([], 'N').__traverDir(__dirname);

        RL.close();
    }

    RL.close();
});
