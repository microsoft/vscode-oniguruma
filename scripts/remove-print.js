/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

const fs = require('fs');
const path = require('path');

const bindingPath = path.join(__dirname, '../out/onig.js');
const fileContents = fs.readFileSync(bindingPath).toString();

fs.writeFileSync(bindingPath, fileContents.replace(/(?<!")\bprint\b(?!")/g, 'onig_print'))
